/*
 * Copyright 2017 Next Century Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/* exported searchTransforms */
/* jshint camelcase:false */

var searchTransforms = (function(_) {
  function getTemplateFromSearchParameters(searchParameters, dateConfig, networkExpansionParameters) {
    var predicates = {};
    var template = {
      clauses: !networkExpansionParameters ? [] : [{
        clauses: [],
        type: 'Ad',
        variable: '?ad1'
      }],
      filters: []
    };
    var andFilter = {
      clauses: [],
      operator: 'and'
    };
    var notFilter = {
      clauses: [],
      operator: 'not exists'
    };

    if(!_.isEmpty(searchParameters)) {
      _.keys(searchParameters).forEach(function(type) {
        var unionClause = {
          clauses: [],
          operator: 'union'
        };

        _.keys(searchParameters[type]).forEach(function(term) {
          if(searchParameters[type][term].enabled) {
            if(dateConfig[term]) {
              // Each date field has only one date variable.
              predicates[type] = [{
                optional: false
              }];

              andFilter.clauses.push({
                constraint: searchParameters[type][term].date,
                operator: term.includes('start') ? '>=' : '<=',
                variable: '?' + type + '1'
              });
            } else if(searchParameters[type][term].search === 'excluded') {
              notFilter.clauses.push({
                constraint: searchParameters[type][term].key,
                predicate: type
              });
            } else if(searchParameters[type][term].search === 'union') {
              unionClause.clauses.push({
                constraint: searchParameters[type][term].key,
                isOptional: false,
                predicate: type
              });
            } else {
              var optional = (searchParameters[type][term].search !== 'required');
              // If network expansion is disabled...
              if(!networkExpansionParameters) {
                predicates[type] = predicates[type] || [];
                predicates[type].push({
                  optional: optional
                });

                template.clauses.push({
                  constraint: searchParameters[type][term].key,
                  isOptional: optional,
                  predicate: type
                });
              } else {
                template.clauses[0].clauses.push({
                  constraint: searchParameters[type][term].key,
                  isOptional: optional,
                  predicate: type
                });

                // If network expansion is disabled for the current type...
                if(!networkExpansionParameters[type]) {
                  template.clauses.push({
                    constraint: searchParameters[type][term].key,
                    isOptional: optional,
                    predicate: type
                  });
                } else {
                  // TODO Should predicate variables for network expansion queries always be required?
                  predicates[type] = [{
                    optional: false
                  }];
                }
              }
            }
          }
        });

        if(unionClause.clauses.length) {
          template.clauses.push(unionClause);
        }
      });

      _.keys(predicates).forEach(function(predicate) {
        for(var i = 1; i <= predicates[predicate].number; ++i) {
          // If network expansion is disabled...
          if(!networkExpansionParameters) {
            template.clauses.push({
              isOptional: predicates[predicate][i - 1].optional,
              predicate: predicate,
              variable: '?' + predicate + i
            });
          } else {
            template.clauses.push({
              isOptional: predicates[predicate][i - 1].optional,
              predicate: predicate,
              variable: '?' + predicate + i
            });

            template.clauses[0].clauses.push({
              isOptional: predicates[predicate][i - 1].optional,
              predicate: predicate,
              variable: '?' + predicate + i
            });
          }
        }
      });
    }

    return template;
  }

  return {
    createFacetsQuery: function(dateConfig) {
      return function(searchParameters, config) {
        var networkExpansionParameters = config ? config.custom : {};
        var isNetworkExpansion = !!(_.findKey(networkExpansionParameters, function(value) {
          return value;
        }));

        var template = getTemplateFromSearchParameters(searchParameters, dateConfig, isNetworkExpansion ? networkExpansionParameters : undefined);

        var predicate = config ? config.aggregationType : undefined;
        var groupBy = {
          limit: (config && config.pageSize ? config.pageSize : 0),
          offset: 0
        };
        var orderBy;
        var selects;

        if(predicate) {
          selects = [{
            'function': 'count',
            type: 'function',
            variable: '?' + predicate
          }];

          if(!isNetworkExpansion || !networkExpansionParameters[predicate]) {
            template.clauses.push({
              isOptional: false,
              predicate: predicate,
              variable: '?' + predicate
            });
          }

          if(isNetworkExpansion && !networkExpansionParameters[predicate]) {
            template.clauses[0].clauses.push({
              isOptional: false,
              predicate: predicate,
              variable: '?' + predicate
            });
          }

          groupBy.variables = [{
            variable: '?' + predicate
          }];

          orderBy = {
            values: [{
              'function': (config && config.sortOrder === '_term' ? undefined : 'count'),
              order: (config && config.sortOrder === '_term' ? 'asc' : 'desc'),
              variable: '?' + predicate
            }]
          };
        }

        return {
          SPARQL: {
            'group-by': groupBy,
            'order-by': orderBy,
            select: {
              variables: selects
            },
            where: {
              clauses: template.clauses,
              filters: template.filters,
              type: 'Ad',
              variable: '?ad'
            }
          },
          type: 'Aggregation'
        };
      };
    },

    createSearchQuery: function(dateConfig) {
      return function(searchParameters, config) {
        var networkExpansionParameters = config ? config.custom : {};
        var isNetworkExpansion = !!(_.findKey(networkExpansionParameters, function(value) {
          return value;
        }));

        var template = getTemplateFromSearchParameters(searchParameters, dateConfig, isNetworkExpansion ? networkExpansionParameters : undefined);

        var groupBy = (!config || !config.page || !config.pageSize) ? undefined : {
          limit: config.pageSize,
          offset: (config.page - 1) * config.pageSize
        };

        return {
          SPARQL: {
            'group-by': groupBy,
            select: {
              variables: [{
                type: 'simple',
                variable: !isNetworkExpansion ? '?ad' : '?ad2'
              }]
            },
            where: {
              clauses: template.clauses,
              filters: template.filters,
              type: 'Ad',
              variable: !isNetworkExpansion ? '?ad' : '?ad2'
            }
          },
          type: 'Point Fact'
        };
      };
    },

    searchResults: function(response, config) {
      var fields = {};
      var hits = {};

      if(response && response.length) {
        if(response[0].query && response[0].query.SPARQL && response[0].query.SPARQL.where && response[0].query.SPARQL.where.clauses && response[0].query.SPARQL.where.clauses.length) {
          var clauses = response[0].query.SPARQL.where.clauses;
          if(config && config.isNetworkExpansion && response[0].query.SPARQL.where.clauses[0].clauses && response[0].query.SPARQL.where.clauses[0].clauses.length) {
            clauses = response[0].query.SPARQL.where.clauses[0].clauses;
          }
          clauses.forEach(function(clause) {
            if(clause.predicate && clause.constraint && clause._id) {
              fields[clause.predicate] = fields[clause.predicate] || {};
              fields[clause.predicate][('' + clause.constraint).toLowerCase()] = clause._id;
            }
          });
        }

        if(response[0].result) {
          if(config && config.isNetworkExpansion && response[0].result.length > 1) {
            hits = response[0].result[1].hits || {};
          } else {
            hits = response[0].result.hits || {};
          }
        }
      }

      return {
        fields: fields,
        hits: hits
      };
    }
  };
});

