# DIG UI Configuration Guide

## General Configuration

Please see the [README](https://github.com/NextCenturyCorporation/dig-ui#server-configuration-local).

## Project Configuration

The project configuration can be set in one of two ways:
- Set `CONFIG_ENDPOINT` to a REST endpoint.  Whenever a DIG page is loaded, DIG will GET `CONFIG_ENDPOINT + <project>` and expect a JSON object containing your project configuration.
- Set `OVERRIDE_CONFIG` to a stringified JSON object containing your project configuration.

### Example

The required project configuration properties are:

```
{
  configuration: {
    sandpaper_<databaseType>_url: <searchEndpoint>
  },
  fields: { ... },
  index: {
    <databaseType>: <elasticsearchIndexName>
  },
  root_name: <elasticsearchIndexType>
}
```

Here, `<databaseType>` is the `DATABASE_TYPE` you set in the Server Configuration.

The optional project configuration properties are:

```
{
  hide_timelines: <boolean>,
  image_prefix: <string>,
  image_suffix: <string>,
  newline_tag: <'newline'|'break'>,
  show_images_in_facets: <boolean>,
  show_images_in_search_form: <boolean>
}
```

### Fields Config Options

Option | Effect | Default Value
------ | ------ | -------------
key | The unique ID for the item. | **REQUIRED**
type | The type of item.  Values are `'date'` (in ISO format), `'email'`, `'hyphenated'` (see [hyphenated format](https://github.com/NextCenturyCorporation/dig-ui/blob/master/CONFIG_README.md#hyphenated-format)), `'image'` (in SHA1 format), `'kg_id'` (an elasticsearch `_id`), `'location'` (see [location format](https://github.com/NextCenturyCorporation/dig-ui/blob/master/CONFIG_README.md#location-format)), `'number'`, `'phone'`, `'string'`, `'type'` (see [type_format](https://github.com/NextCenturyCorporation/dig-ui/blob/master/CONFIG_README.md#type_format)), or `'username'` (see [username format](https://github.com/NextCenturyCorporation/dig-ui/blob/master/CONFIG_README.md#username-format)). | **REQUIRED**
color | The color for the item from the list of [colors](https://github.com/NextCenturyCorporation/dig-ui/blob/master/CONFIG_README.md#colors). | `'grey'`
extraction_field | The extraction field in each elasticsearch document.  Overrides `field`. | See `field`.
field | The actual field in the `_source` object of each elasticsearch document. | Aggregation Field:  `'knowledge_graph.' + key + '.key'`, <br> Query Field:  `'knowledge_graph.' + key + '.value'`
field_order | A number representing the order of the item inside its `group` as shown in the Search Window and the Facets.  Lower numbers are shown first. | Alphabetical after all items with a `field_order`
free_text_search | Whether to search on the field with the keywords in the free text search (the input field in the search page navigation bar).  Values are boolean.  If `free_text_search` is false for all fields, the free text search is hidden. | false
group_name | The name of the group containing the item.  Determines the position of the item in the Search Window and the Facets. | None
group_order | A number representing the order of this item's group as shown in the Search Window and the Facets.  Lower numbers are shown first.  Requires `group_name`. | Alphabetical after all items with a `group_order`
icon | The polymer or fontawesome icon for the item from the list of [icons](https://github.com/NextCenturyCorporation/dig-ui/blob/master/CONFIG_README.md#icons). | `'icons:text-format'`
screen_label | The singular label for the item. | `'Extraction'`
screen_label_plural | The plural label for the item. | `'Extractions'`
show_as_link | Whether to show the item as a link.  Values are `'entity'` (link to its own DIG Entity Page), `'text'` (the text itself is a link), or `'no'`. | `'no'`
show_in_result | Whether to show the item in the result.  Values are `'title'` (the result title), `'description'` (the result description), `'header'` (an extraction in the result header), `'detail'` (an extraction in the result details), `'nested'` (a nested extraction), `'series'` (a time series), or `'no'`. | `'no'`
show_in_search | Whether to show the item in the Search Window.  Values are boolean. | `false`
width | The numerical fixed width of extractions in the results. | None

### Hyphenated Format

The `hyphenated` field type supports a format containing the item followed by an unlimited number of properties separated by hyphens.  Each property is a key/value pair separated by colons:
```
<item>-<key1>:<value1>-...-<keyN>:<valueN>
```
Supported properties include:  `currency`, `site`, `time_unit` (in minutes), `unit`

### Location Format

The `location` field type supports a format containing the city, state, country, latitude, and longitude of a location separated by colons:
```
<city>:<state>:<country>:<longitude>:<latitude>
```

### Type Format

The `type` field type supports the following options:

- `measure`

### Username Format

The `username` field type supports a format containing the site and username separated by a space:
```
<site> <username>
```

### Colors

- amber
- black
- blue
- blue-grey
- brown
- cyan
- deep-orange
- deep-purple
- green
- grey
- indigo
- light-blue
- light-green
- lime
- orange
- pink
- purple
- red
- teal
- white
- yellow

### Icons

Any polymer icon:  https://www.webcomponents.org/element/PolymerElements/iron-icons/demo/demo/index.html

Any fontawesome icon preceeded by `'fa:'` (aliases are not supported):  https://fontawesome.com/icons
