# VNPT LLM API

OpenAI-compatible chat completions API.

## Endpoint

```
Base URL: https://assistant-stream.vnpt.vn/v1/
```

## Models

| Model | Use case |
|-------|----------|
| llm-large-v4 | Best quality |
| llm-medium-v4 | Balanced |

## Python Example

```python
from openai import OpenAI

client = OpenAI(
   api_key="<your-jwt-token>",
   base_url="https://assistant-stream.vnpt.vn/v1/"
)

response = client.chat.completions.create(
   model="llm-large-v4",
   messages=[
       {"role": "system", "content": "Bạn là trợ lý ảo"},
       {"role": "user", "content": "Xin chào"}
   ],
   max_tokens=4096,
   temperature=0.8,
   stream=True,
)

for chunk in response:
    print(chunk.choices[0].delta.content, end="")
```

## Curl Example

```bash
curl 'https://assistant-stream.vnpt.vn/v1/chat/completions' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <your-jwt-token>' \
  -d '{
    "model": "llm-medium-v4",
    "messages": [{"role": "user", "content": "Xin chào"}],
    "temperature": 0.7,
    "max_tokens": 100
  }'
```

## Parameters

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| model | string | required | Model ID |
| messages | array | required | Chat history |
| max_tokens | int | 4096 | Max response tokens |
| temperature | float | 0.7 | Randomness (0-1) |
| top_p | float | 0.9 | Nucleus sampling |
| stream | bool | false | SSE streaming |

## Notes

- Requires VNPT VPN for access
- JWT token from VNPT portal
- OpenAI SDK compatible
