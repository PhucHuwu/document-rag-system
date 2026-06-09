# Gap Analysis — Hạng mục còn thiếu so với Docs

> Đối chiếu giữa `docs/project.md`, `docs/system-design.md`, `docs/rag-pipeline.md` (mục tiêu **production-ready**) với code hiện tại trong `apps/api`, `apps/ai`, `apps/web`.

Chú thích mức độ: 🔴 Cốt lõi (chặn luồng chính) · 🟠 Quan trọng · 🟡 Bổ sung / production hardening.

---

## 1. AI Backend & RAG Pipeline 🔴

Đây là khối thiếu lớn nhất. Hiện `apps/ai` chỉ là khung (stub).

- 🔴 **Ingestion pipeline chưa xây dựng.** `app/services/ingestion_service.py::process_document` trả về `not_implemented`. Toàn bộ luồng `Upload → Docling → Normalize → Segment → Chunk → Embedding → Qdrant` (rag-pipeline §4) chưa có.
- 🔴 **Docling parse** chưa tích hợp (chỉ khai báo trong `requirements.txt`).
- 🔴 **Normalize / Segment / Chunking** (rag-pipeline §4.4–4.6, chunk 500–900 tokens, overlap, structure-aware) chưa có.
- 🔴 **Embedding** chưa tích hợp (`EMBEDDING_MODEL=BAAI/bge-m3` mới chỉ là config string, không có code gọi model).
- 🔴 **Qdrant chưa được sử dụng.** `qdrant-client` đã cài nhưng không có code tạo collection, payload index (`workspace_id`/`folder_id`/`document_id`/`is_active`), upsert hay search.
- 🔴 **Retrieval thật trong RAG query.** `app/services/rag_service.py::query` chỉ build filter rồi trả `sources: []`; chưa embed câu hỏi, chưa search Qdrant, chưa trả nguồn.
- 🟠 **Reranking** (rag-pipeline §5.8) chưa có; `RERANKER_MODEL` để trống và không dùng.
- 🟠 **Query understanding / rewrite** câu hỏi follow-up (§5.5) chưa có.
- 🟠 **Context assembly** có cấu trúc nguồn (§5.9) chưa có.
- 🔴 **Post-retrieval validation** chunk sau khi search (§5.7 — re-check `workspace_id`/`folder_id`/`is_active`, loại chunk ngoài scope, ghi security warning) chưa có.
- 🟠 **Prompt guardrail** tách lớp (System / Assistant / Safety / Context...) và chống prompt injection trong tài liệu (§5.10) chưa có; prompt hiện hard-code đơn giản trong `rag_service`.
- 🟠 **`DocumentChunk`** trong Prisma đã có model nhưng **không có gì ghi dữ liệu** vào (do ingestion chưa chạy).

## 2. Queue System & AI Worker 🔴

- 🔴 **Không có queue.** Redis có trong `docker-compose.yml` nhưng `REDIS_URL` **không được dùng ở bất kỳ đâu** trong code. Không có BullMQ/Redis Queue (project.md §10.2).
- 🔴 **Ingestion job tạo ra nhưng không ai xử lý.** `DocumentsService.upload` tạo `IngestionJob(status=pending)` rồi dừng; không có producer đẩy job, không có consumer.
- 🔴 **AI Worker** (`app/worker.py`) là placeholder, chỉ in log; chưa consume queue, chưa đọc file từ MinIO.
- 🟡 **Retry job** khi lỗi tạm thời (project.md §8.4) chưa có (`IngestionJob.attempts` có cột nhưng không dùng).

## 3. Chat, Session & Streaming 🟠

- 🟠 **Liệt kê session** (`GET /chat/sessions`) chưa có. Hiện chỉ có `POST /chat/messages`.
- 🟠 **Xem lịch sử hội thoại của chính mình** (project.md §7.7) — không có endpoint đọc `ChatMessage`.
- 🟠 **Workspace Owner xem metadata session** (system-design Workflow 3, §7.7) chưa có endpoint; cũng chưa enforce "owner không xem nội dung chat người khác" (403 khi `session.user_id != caller`).
- 🟠 **Streaming** (SSE/WebSocket, rag-pipeline §5.1 `POST /chat/sessions/{id}/stream`, project.md §10.2) chưa có; chat hiện hoàn toàn đồng bộ.
- 🟡 `ChatService` hiện phụ thuộc `DevDataService` và mặc định `assistantId = "asst_hr"` — cần thay bằng luồng chuẩn trước production.

## 4. RBAC — lệch so với Permission Matrix 🟠

`apps/api/src/modules/rbac/permissions.ts` mới có ~10 permission code; `docs/system-design.md` §4 định nghĩa nhiều hơn.

- 🟠 **`system_admin` hiện không có quyền nào** (`rolePermissions.system_admin = []`), trong khi design giao cho System Admin cả nhóm `system:*`.
- 🟠 **Thiếu nhóm `platform:*`** (trừ `platform:workspace:manage`): `owner:assign`, `resource:manage`, `dashboard:view`, `model:manage`, `admin:manage`, `system:config`, `data:emergency`.
- 🟠 **Thiếu toàn bộ nhóm `system:*`**: `policy:manage`, `user_policy:manage`, `pipeline:monitor`, `ai_policy:manage`, `rag:monitor`, `audit_log:review`, `workspace:support`.
- 🟠 **Thiếu** `document:view`, `chat:session:manage`, `workspace:audit_log:view`.
- 🔴 **`system_prompt` của Assistant** (system-design Fix #3: chỉ Super/System Admin sửa được, Workspace Owner thì không) — **chưa có cột trong schema `Assistant`**, chưa có quyền `system:ai_prompt:manage`, chưa có endpoint.
- 🟡 Guardrail / AI policy / model policy (`system:ai_policy:manage`, `platform:model:manage`) chưa có.

## 5. Quản lý Tài liệu 🟠

- 🟠 **Xóa tài liệu** (project.md §7.4) chưa có endpoint (chỉ có upload/list/get).
- 🟠 **Preview/Download tài liệu** từ MinIO chưa có; `StorageService` mới chỉ có `uploadObject`, thiếu get/presigned URL.
- 🟡 **Validate loại file** theo danh sách hỗ trợ (PDF, DOCX, XLSX, PPTX, TXT, MD, HTML, CSV — §7.4) chưa có.
- 🟡 **Reindex** tài liệu chưa có.
- 🟡 Versioning đã có (soft-delete bản cũ qua `isActive`), nhưng vì chưa có ingestion nên chưa "chỉ active version mới sau khi index xong" (rag-pipeline §4.8).

## 6. Audit Log 🟠

- 🟠 **Chỉ ghi audit cho `document.upload`.** Các thao tác nhạy cảm khác trong project.md §7.8 chưa ghi log: login, xóa tài liệu, thay đổi phân quyền folder, cập nhật/xóa assistant, đổi cấu hình RAG, khóa user, thao tác hỗ trợ.
- 🟠 **Xem audit log** (`workspace:audit_log:view`, `system:audit_log:review`) chưa có endpoint.

## 7. Dashboard, Monitoring & Observability 🟠

- 🟠 **Dashboard** quản trị workspace & hệ thống (project.md §7.9; `platform:dashboard:view`) chưa có.
- 🟠 **Giám sát ingest & retrieval** (`system:pipeline:monitor`, `system:rag:monitor`) chưa có endpoint; `RetrievalTrace` được ghi DB nhưng không có API đọc/aggregate.
- 🟡 **Observability stack** (project.md §10.6) chưa có: Prometheus/Grafana (metrics), OpenTelemetry (tracing), Sentry (error), Loki/ELK (log tập trung).
- 🟠 **Health check phụ thuộc** — `GET /health` trả `"ok"` tĩnh, chưa kiểm tra Postgres/Redis/Qdrant/MinIO.

## 8. Quản lý Workspace & Quota 🟡

- 🟡 **Quota tài nguyên** (storage/LLM/queue — `platform:resource:manage`, project.md §7.1) chưa có field trong schema, chưa có logic.
- 🟡 **Khóa/mở khóa workspace** mới chỉ qua cập nhật `status`; chưa enforce chặn truy cập khi workspace `inactive` ở mọi luồng (mới chỉ check trong `getEffectiveFolderScope`).
- 🟡 **Gán/đổi Workspace Owner** (`platform:owner:assign`) chưa có endpoint riêng.

## 9. Frontend / Web App 🔴

`apps/web` hiện gần như rỗng (chỉ `layout.tsx`, `page.tsx`, `styles.css`).

- 🔴 **Chưa có UI** nào hoạt động: đăng nhập, chat, quản trị workspace/user/folder/document/assistant, dashboard.
- 🟠 **Tailwind CSS + shadcn/ui** (project.md §10.1) chưa cài đặt.
- 🟠 **API client** kết nối Core Backend chưa có.

## 10. Bảo mật & Yêu cầu Phi chức năng 🟠

- 🔴 **Core Backend → AI Backend không có xác thực nội bộ.** Bất kỳ ai truy cập được `:8000` đều gọi được `/rag/query`; cần shared secret/mTLS/network policy (project.md §9 "AI Backend không public").
- 🟠 **Input validation** — chưa có `class-validator`/DTO và `ValidationPipe` global trong `main.ts`; controller dùng plain type, không validate.
- 🟠 **Rate limiting** (Redis), **WAF**, **IP allowlist** cho endpoint admin (project.md §10.6) chưa có.
- 🟡 **Refresh token / thu hồi token** chưa có (chỉ access token).
- 🟡 **SSO** (Google/Entra/Okta — §8.1, §14) — ngoài phạm vi giai đoạn đầu, ghi nhận để định hướng.
- 🟡 **Mã hóa dữ liệu nhạy cảm at-rest** (§8.1) — chưa cấu hình ngoài mặc định hạ tầng.
- 🟡 **Xóa/ẩn danh dữ liệu theo yêu cầu khách hàng** (§8.5) chưa có cơ chế.

## 11. Testing 🔴

- 🔴 **Không có test nào.** `docs/rag-pipeline.md` §9 liệt kê 11 test bảo mật bắt buộc (cô lập workspace, scope HR≠IT, effective scope rỗng, thu hồi quyền, document inactive, thiếu `workspace_id`/scope, client gửi folder giả, post-validation loại chunk ngoài scope...). Chưa có case nào.
- 🟠 Chưa cấu hình test framework (Jest cho NestJS, pytest cho AI).

## 12. CI/CD & Hạ tầng triển khai 🟡

- 🟡 **CI/CD** (GitHub Actions/GitLab CI — §10.5) chưa có.
- 🟡 **Kubernetes manifests**, **Terraform (IaC)**, **Nginx/Load balancer + TLS** (§10.5) chưa có.
- 🟢 Dockerfile cho từng app (`apps/*/Dockerfile`) và `docker-compose.yml` đã có.

---

## Tóm tắt ưu tiên

| Ưu tiên | Hạng mục |
| --- | --- |
| 🔴 Phải có cho luồng chính | RAG pipeline thật (Docling→chunk→embed→Qdrant), Queue + AI Worker, Retrieval + post-validation, Web UI cơ bản, Auth nội bộ Core↔AI, Test bảo mật |
| 🟠 Quan trọng | Session/history/streaming, RBAC đầy đủ + system_prompt, xóa/preview document, audit log mở rộng, dashboard/monitoring, validation, rate limit |
| 🟡 Production hardening | Quota, observability stack, CI/CD, K8s/Terraform, SSO, mã hóa at-rest, xóa dữ liệu theo yêu cầu |

## Phần đã làm tốt (tham chiếu)

- Core Backend: Auth (login + JWT + `/auth/me`), RBAC guard/decorator, CRUD cho workspaces/users/folders/documents/assistants, upload tài liệu lên MinIO + tạo ingestion job + audit upload + versioning.
- **Effective scope** (`user ∩ assistant`, mở rộng theo cây) đã hiện thực và enforce trong `dev-data.service.ts` + `chat.service.ts`; `RetrievalTrace` được ghi mỗi query.
- Prisma schema phủ đủ thực thể trong project.md §11.
- AI Backend reject query khi thiếu scope; filter Qdrant luôn pin `workspace_id` + `is_active`.
