# API Chat Completions 
## Ví dụ Python
```python
from openai import OpenAI
client = OpenAI(
   api_key="eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0cmFuc2FjdGlvbl9pZCI6ImFkZmU0Nzk3LTRlMjktNDE2ZS1iZGViLWEwMWQyZTIwYmY5NSIsInN1YiI6IjNjYWY4NDhmLWY5MjMtMTFlYy1hOGQzLWQxYzkxZWY5YjBiYyIsImF1ZCI6WyJyZXN0c2VydmljZSJdLCJ1c2VyX25hbWUiOiJzbWFydGJvdGFpdGVhbUBnbWFpbC5jb20iLCJzY29wZSI6WyJyZWFkIl0sImlzcyI6Imh0dHBzOi8vbG9jYWxob3N0IiwibmFtZSI6InNtYXJ0Ym90YWl0ZWFtQGdtYWlsLmNvbSIsInV1aWRfYWNjb3VudCI6IjNjYWY4NDhmLWY5MjMtMTFlYy1hOGQzLWQxYzkxZWY5YjBiYyIsImF1dGhvcml0aWVzIjpbIlVTRVIiXSwianRpIjoiYzM3M2I0YmItODFiOC00MjFlLTk2MDEtNTJmMDRhODI0NGIyIiwiY2xpZW50X2lkIjoiYWRtaW5hcHAifQ.F0ayt77lAgCEQIUyDdoVJTLnn5z--k3_pEnXDzHgaN9uy7bPMIslRMRAwV1uDXpgwL-og_MQ8N-MXJrxW2kmpeRY_qRo4wuIuQajK1MeNbESKy7_iAhpSAedyisVKVXzT8czxHe54jLYRYxDUMCxik63DW_lSX_5I1cjSlGFkUQpS6IWDsahHB6Yh3enAe4IfWXGjDwUpDxkHuhzgyW7H8p1ofyiyDSPcktTdik_kKtaRngW8FbSiY3QBYCTVpSmFkCLz9B0I9r6-JkGqurLFNkdW971u2pNsDFJUBtABU5YQZBuTHt3eGkdivjv8ndZmsRdW0PWsKtwcm8FfHx2-Q",
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