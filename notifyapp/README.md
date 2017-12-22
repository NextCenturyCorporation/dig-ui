# notifyapp

This application runs DIG saved queries at specified intervals, checks the query results for new items, triggers alerts if new items are found, and sends emails to alert users.

# Environment Variables

Variable                  | Description                                   | Default
------------------------- | ----------------------------------------------|-----------------------------
DATA_INDEX_NAME           | Elasticsearch data index name                 | dig-webpages
DATA_INDEX_TYPE           | Elasticsearch data index type                 | webpage
DATE_FIELD                | Date field in the data index on which to sort | timestamp
DIG_SUPPORT_EMAIL_ADDRESS | Address to which support emails are sent      | support@memex.software
DIG_URL                   | Application URL for the alert emails          | none
ES_AUTH                   | Authentication for the elasticsearch client   | null
ES_HOST                   | Host for the elasticsearch client             | localhost
ES_PORT                   | Port for the elasticsearch client             | 9200
ES_PROTOCOL               | Protocol for the elasticsearch client         | http
LOG_NAME                  | Name for the logger                           | DIG Alerts App
LOG_PATH                  | File path for the logger                      | /var/log/dig_alerts_app.log
MAILER_EMAIL_ADDRESS      | Address from which emails are sent            | dig-alerts@memex.software
SMTP_HOST                 | SMTP hostname                                 | email-smtp.us-east-1.amazonaws.com
SMTP_PASS                 | SMTP password                                 | none
SMTP_PORT                 | SMTP port                                     | 465
SMTP_TLS_CIPHER           | SMTP TLS cipher                               | none
SMTP_USER                 | SMTP username                                 | none
USER_INDEX_NAME           | Elasticsearch user index name                 | dig-profiles
USER_INDEX_TYPE           | Elasticsearch user index type                 | profile

