# API Chat Completions 
## Ví dụ Python
```python
from openai import OpenAI
client = OpenAI(
   api_key="",
   base_url="https://assistant-stream.vnpt.vn/v1/"
)


isStream = True
response = client.chat.completions.create(
   model="llm-large-v4",
   messages=[
       {"role": "system", "content": "Bạn là trợ lý ảo của Trung Tâm Sáng Tạo - VNPT IT"},
       {"role": "user", "content": "Hãy làm cho tôi một bài thơ về mùa thu Hà Nội"}
   ],
   max_tokens=4096,
   temperature=0.8,
   top_p=0.9,
   stream=isStream,
)


if isStream:
   for chunk in response:
       print(chunk)
       print(chunk.choices[0].delta)
       print("****************")
else:
   print(response.choices[0].message.content)
```

## Ví dụ Curl
```bash
curl --location 'https://assistant-stream.vnpt.vn/v1/chat/completions' \
  --header 'Accept: application/json' \
  --header 'Content-Type: application/json' \
  --header 'Authorization: Bearer xxx' \
  --data '{
    "model": "llm-medium-v4",
    "messages": [
      {
        "role": "user",
        "content": "Xin chào, bạn có thể giúp tôi không?"
      }
    ],
    "temperature": 0.7,
    "max_tokens": 100
  }'
```