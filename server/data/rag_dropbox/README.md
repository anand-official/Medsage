# RAG Auto Ingestion

Runtime workspace for Google Drive / local PDF ingestion into Qdrant.

Typical dry run:

```powershell
cmd /c npm run rag:auto-ingest -- --drive-url "https://drive.google.com/drive/folders/..." --subject ENT --dry-run
```

Actual ingest:

```powershell
cmd /c npm run rag:auto-ingest -- --drive-url "https://drive.google.com/drive/folders/..." --subject ENT
```

Local folder ingest:

```powershell
cmd /c npm run rag:auto-ingest -- --source server/data/rag_dropbox/downloads/folder_1 --subject ENT --dry-run
```

Reports are written to `completed/` or `failed/`. Downloads and generated reports are ignored by git.
