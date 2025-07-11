#!/bin/bash

# 检查必要的环境变量
if [ -z "$EDGE_CONFIG" ]; then
  echo "Error: EDGE_CONFIG environment variable is not set"
  exit 1
fi

# 从 EDGE_CONFIG URL 中提取信息
EDGE_CONFIG_ID=$(echo $EDGE_CONFIG | sed -n 's/.*\/\([^?]*\).*/\1/p')
EDGE_CONFIG_TOKEN=$(echo $EDGE_CONFIG | sed -n 's/.*token=\([^&]*\).*/\1/p')

# 使用 VERCEL_ACCESS_TOKEN（如果设置了）或者 EDGE_CONFIG_TOKEN
ACCESS_TOKEN=${VERCEL_ACCESS_TOKEN:-$EDGE_CONFIG_TOKEN}

# 1. 获取所有 Edge Config
echo "Getting all Edge Configs..."
curl -H "Authorization: Bearer $ACCESS_TOKEN" \
     "https://api.vercel.com/v1/edge-config"

echo -e "\n\n"

# 2. 获取特定 Edge Config 的所有项目
echo "Getting all items from specific Edge Config..."
curl -H "Authorization: Bearer $ACCESS_TOKEN" \
     "https://api.vercel.com/v1/edge-config/$EDGE_CONFIG_ID/items"

echo -e "\n\n"

# 3. 更新特定项目
echo "Updating specific item..."
curl -X PATCH \
     -H "Authorization: Bearer $ACCESS_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "items": [
         {
           "operation": "upsert",
           "key": "taskAssignments",
           "value": [
             {
               "id": 5,
               "taskId": 5,
               "memberId": 4,
               "startDate": "2025-06-25",
               "endDate": "2025-07-10"
             },
             {
               "id": 3,
               "taskId": 3,
               "memberId": 8,
               "startDate": "2025-07-07",
               "endDate": "2025-07-14"
             }
           ]
         }
       ]
     }' \
     "https://api.vercel.com/v1/edge-config/$EDGE_CONFIG_ID/items" 