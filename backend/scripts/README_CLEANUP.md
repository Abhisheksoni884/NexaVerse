# Data Cleanup Script

## Purpose
The `cleanup_data.py` script clears all data from your NexaVerse knowledge base, allowing you to start fresh.

### What Gets Cleared
- ✅ **Azure AI Search Index** — All vectorized documents and search metadata
- ✅ **Azure Blob Storage** — All uploaded document files
- ✅ **Azure Cosmos DB** — All document metadata records

### What Does NOT Get Cleared
- ❌ Audit logs (preserved for compliance)
- ❌ Token usage records (preserved for analytics)
- ❌ User accounts and authentication data

---

## How to Use

### Step 1: Ensure Backend Dependencies Are Installed
```bash
cd backend
pip install -r requirements.txt
```

### Step 2: Make Sure .env is Configured
Verify that `backend/.env` has all Azure credentials filled in:
```bash
cat .env | grep AZURE_
```

### Step 3: Run the Cleanup Script
```bash
python scripts/cleanup_data.py
```

### Step 4: Confirm the Action
The script will show a warning and ask you to type **`yes`** to confirm:
```
⚠️  WARNING: This will permanently delete:
   • All documents in Azure AI Search: knowledge-index
   • All files in Azure Blob Storage: documents
   • All metadata in Cosmos DB: documents-meta

Type 'yes' to confirm: yes
```

### Step 5: Watch the Progress
```
🧹 NexaVerse Data Cleanup — Clear all vector data & documents
======================================================================

🔄 Clearing Azure AI Search index... ✅ Done
🔄 Clearing Azure Blob Storage... ✅ Done (deleted 5 files)
🔄 Clearing Azure Cosmos DB metadata... ✅ Done (deleted 5 items)

======================================================================
✅ Cleanup complete! All data has been cleared.
✅ Ready to upload fresh documents from the UI.
======================================================================
```

---

## Testing the Upload Workflow

After cleanup, test the document upload flow:

1. **Start the backend**
   ```bash
   python main.py
   ```

2. **Open the frontend UI** (usually http://localhost:3000)

3. **Upload a test document**
   - Click "Upload Document"
   - Select a PDF or text file
   - Wait for processing to complete

4. **Monitor the logs**
   - Backend logs: `backend/logs/2026-07-22/admin.log`
   - Look for "Document processed successfully" messages

5. **Test the RAG pipeline**
   - Ask a question related to the document you uploaded
   - Verify that the answer comes from your uploaded document

---

## Troubleshooting

### "Failed: Connection refused"
- Check that Azure credentials in `.env` are correct
- Verify network connectivity to Azure services

### "Failed: Unauthorized"
- Double-check `AZURE_SEARCH_API_KEY` and `AZURE_COSMOS_KEY` in `.env`
- Keys may have expired — regenerate them in Azure Portal

### "Index doesn't exist" warning
- This is normal on first run — the index will be recreated

---

## Safety Notes
- ⚠️ This action is **permanent and irreversible**
- Always have a backup of important documents before running cleanup
- Use this script in **development/testing environments only**
- Never run this in production without explicit approval
