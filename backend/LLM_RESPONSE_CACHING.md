# LLM Response Caching

## Overview
NexaVerse now includes intelligent LLM response caching to dramatically speed up repeated queries. When a user asks the same question again, the system returns the cached response in **<100ms** instead of waiting 6-10 seconds for the LLM.

## How It Works

### Cache Key Generation
The cache key is based on:
1. **Query text** (case-insensitive, trimmed)
2. **User roles** (determines which documents they can access)

This ensures:
- Same query + same user role = cache hit
- Same query + different user role = cache miss (users see different results based on permissions)
- Similar queries = cache miss (caching is exact-match only)

### Cache Storage
- **Location:** In-memory OrderedDict (LRU eviction)
- **Max entries:** 256 (configurable in `backend/routers/chat.py`)
- **TTL:** 1 hour (configurable)
- **Eviction:** When full, oldest entry is removed first (LRU policy)

## Performance Impact

### Before Caching
```
Query 1 (new):     6-10 seconds  (LLM call)
Query 1 (repeated): 6-10 seconds (LLM call again)
Query 2 (new):     6-10 seconds  (LLM call)
Total: ~20 seconds
```

### After Caching
```
Query 1 (new):       6-10 seconds (<100ms embedding + search + <100ms cache)
Query 1 (repeated):  <100ms       ✅ CACHE HIT
Query 2 (new):       6-10 seconds (LLM call)
Total: ~16 seconds (20% faster)
```

### Real-World Savings
- **Common scenario:** User asks same question 3-5 times
- **Savings per cache hit:** 6-10 seconds
- **Typical session improvement:** 12-50 seconds faster

## Viewing Cache Hits in Logs

### Log Format
When a cached response is returned:

```
[2026-07-22 06:18:40.703] INFO    | ✓ LLM RESPONSE CACHE HIT — returning cached response in <100ms
[2026-07-22 06:18:40.704] DEBUG   | Cache key: a1b2c3d4e5... | Cached response: 1250 chars
[2026-07-22 06:18:40.850] INFO    | Cached response streamed — approx 312 tokens (FROM CACHE)
```

When the LLM is called:

```
[2026-07-22 06:18:40.703] INFO    | LLM streaming started (cache miss — calling Azure OpenAI)
[2026-07-22 06:18:47.178] INFO    | LLM streaming complete — approx 397 tokens
[2026-07-22 06:18:47.268] INFO    | Response cached — future identical queries will use cache
```

### Key Indicators
- **Cache hit:** Look for "✓ LLM RESPONSE CACHE HIT" or "FROM CACHE"
- **Cache miss:** Look for "cache miss — calling Azure OpenAI"
- **Cache storage:** Look for "Response cached — future identical queries will use cache"

## Testing Cache Behavior

### Test 1: Same Query Twice
1. Ask: "Tell me about the HR policy"
2. Wait for response (will take 6-10 seconds, logs show "cache miss")
3. Ask the **exact same question** again
4. Response appears instantly (<100ms, logs show "CACHE HIT")

### Test 2: Different Roles
1. As `admin`, ask: "Tell me about the HR policy"
2. Response cached (6-10 seconds)
3. As `viewer`, ask: "Tell me about the HR policy"
4. Still calls LLM (~6-10 seconds, different cache key for different role)

### Test 3: Slightly Different Query
1. Ask: "Tell me about the HR policy"
2. Ask: "Tell me about the hr policy" (lowercase)
3. Cache hit — queries are normalized (case-insensitive)
4. Ask: "What is the HR policy?"
5. Cache miss — different query text

## Cache Statistics

View cache size and hits in the logs:

```python
# In backend/routers/chat.py
print(f"Cache entries: {len(_response_cache)}")  # Current entries
print(f"Cache max: {_RESPONSE_CACHE_MAX}")       # Max capacity (256)
print(f"Cache TTL: {_RESPONSE_CACHE_TTL}s")     # Time to live (3600s = 1 hour)
```

## Configuration

To adjust cache behavior, edit `backend/routers/chat.py`:

```python
_RESPONSE_CACHE_MAX = 256      # Increase for more storage
_RESPONSE_CACHE_TTL = 3600     # Increase for longer retention
```

## Limitations & Notes

1. **Cache is in-memory:** Lost if the backend restarts
2. **Role-aware:** Different users with different roles get different cache buckets
3. **Exact-match only:** Similar but not identical queries don't hit cache
4. **No conversation context:** Cache based on query + roles only, not conversation history
5. **TTL-based eviction:** Entries older than 1 hour are automatically removed
6. **LRU eviction:** When cache is full, oldest least-recently-used entries are removed

## Future Enhancements

1. **Redis-backed cache:** Persist cache across backend restarts
2. **Semantic caching:** Cache similar queries, not just exact matches
3. **User-specific caching:** Cache per user-role combination with stats
4. **Cache invalidation:** Automatically clear cache when documents are updated
5. **Cache warming:** Pre-populate cache with frequent questions

## Related Features

- **Embedding cache:** Already implemented in `backend/services/openai_service.py`
  - Caches query embeddings (512 entries, 1-hour TTL)
  - Saves embedding API calls (~300-500ms per hit)

- **Parallel processing:** Embedding + content safety run concurrently
  - Saves 300-500ms per request

- **Fire-and-forget audit logs:** Token usage logged after response sent
  - Improves perceived response time
