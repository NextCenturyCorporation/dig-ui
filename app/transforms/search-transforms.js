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
  function getTemplateFromSearchParameters(searchParameters, dateConfig, optional) {
    var predicates = {};
    var template = {
      clauses: [],
      filters: [],
      selects: []
    };

    if(!_.isEmpty(searchParameters)) {
      _.keys(searchParameters).forEach(function(type) {
        _.keys(searchParameters[type]).forEach(function(term) {
          if(searchParameters[type][term].enabled) {
            if(dateConfig[term]) {
              // Each date field has only one date variable.
              predicates[type] = {
                optional: false,
                number: 1
              };

              if(template.filters.length === 0) {
                template.filters.push({});
              }

              if(!template.filters[0].operator) {
                template.filters[0].operator = 'and';
              }

              if(!template.filters[0].clauses) {
                template.filters[0].clauses = [];
              }

              template.filters[0].clauses.push({
                constraint: searchParameters[type][term].date,
                operator: term.includes('start') ? '>' : '<',
                variable: '?' + type + '1'
              });
            } else if(type) {
              if(!predicates[type]) {
                predicates[type] = {
                  optional: true,
                  number: 0
                };
              }

              ++predicates[type].number;

              template.clauses.push({
                constraint: searchParameters[type][term].key,
                isOptional: optional,
                predicate: type
              });
            }
          }
        });
      });

      _.keys(predicates).forEach(function(predicate) {
        for(var i = 1; i <= predicates[predicate].number; ++i) {
          template.selects.push({
            type: 'simple',
            variable: '?' + predicate + i
          });
          template.clauses.push({
            isOptional: predicates[predicate].optional,
            predicate: predicate,
            variable: '?' + predicate + i
          });
        }
      });
    }

    return template;
  }

  return {
    createFacetsQuery: function(dateConfig) {
      return function(searchParameters, config) {
        var predicate = config ? config.aggregationType : undefined;
        var template = getTemplateFromSearchParameters(searchParameters, dateConfig, false);
        var groupBy = {
          limit: (config && config.pageSize ? config.pageSize : 0),
          offset: 0
        };
        var orderBy;

        if(predicate) {
          template.selects.push({
            'function': 'count',
            type: 'function',
            variable: '?' + predicate
          });

          template.clauses.push({
            isOptional: false,
            predicate: predicate,
            variable: '?' + predicate
          });

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
              variables: template.selects
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
        var template = getTemplateFromSearchParameters(searchParameters, dateConfig, true);
        var groupBy = (!config || !config.page || !config.pageSize) ? undefined : {
          limit: config.pageSize,
          offset: (config.page - 1) * config.pageSize
        };

        return {
          SPARQL: {
            'group-by': groupBy,
            select: {
              variables: template.selects
            },
            where: {
              clauses: template.clauses,
              filters: template.filters,
              type: 'Ad',
              variable: '?ad'
            }
          },
          type: 'Point Fact'
        };
      };
    },

    searchResults: function(response) {
      if(response && response.length && response[0].result) {
        var fields = {};
        if(response[0].query && response[0].query.SPARQL && response[0].query.SPARQL.where && response[0].query.SPARQL.where.clauses && response[0].query.SPARQL.where.clauses.length) {
          response[0].query.SPARQL.where.clauses.forEach(function(clause) {
            if(clause.predicate && clause.constraint && clause._id) {
              fields[clause.predicate] = fields[clause.predicate] || {};
              fields[clause.predicate][clause.constraint] = clause._id;
            }
          });
        }
        return {
          fields: fields,
          hits: response[0].result.hits || []
        };
      }
      return {
        fields: {},
        hits: {}
      };
    }
  };
});

