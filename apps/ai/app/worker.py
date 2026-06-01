from app.services.ingestion_service import IngestionService


def main() -> None:
    # Placeholder worker entrypoint. Production worker should consume queue jobs
    # created by Core Backend and process documents from MinIO.
    IngestionService().run_once()


if __name__ == "__main__":
    main()
