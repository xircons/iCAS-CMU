# LINE Bot Integration - Database Setup

## SQL Tables

Run the SQL in `line_tables.sql` to create the necessary tables for LINE Bot integration:

```bash
# Option 1: Import directly into MySQL
mysql -u your_user -p your_database < backend/database/line_tables.sql

# Option 2: Copy and paste the SQL into your database management tool
```

## Tables Created

1. **line_users** - Maps LINE User IDs to email addresses
2. **line_conversations** - Stores conversation states for LINE users

## Environment Variables

Add these to your `.env` file:

```
LINE_CHANNEL_ACCESS_TOKEN=IgtnK/JcjYMpIzZQSHqbB0kQdLPWdjWj9TEJ050ayFYRDxSL1M6LuLJ28fdry6oABDt9WOeN/VtRYie5dSEgQE0/RQOKTF8X6b9JA0YUwvH/NuiTEu/55r97F7uRWK/gc/bP2dLk4ZUXs1aShLDD6AdB04t89/1O/w1cDnyilFU=
LINE_CHANNEL_SECRET=3110ecd8c8e5394724fab5333dc95ada
```

## Webhook URL

Configure your LINE Bot webhook URL to:
```
https://your-domain.com/api/line/webhook
```

Make sure your server is accessible from the internet for LINE to send webhook events.

