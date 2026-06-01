# Tina Chatbot - Tổng Quan Dự Án

## 1. Thông Tin Chung

**Tên dự án:** Tina Chatbot

**Loại sản phẩm:** Nền tảng Chatbot RAG dạng SaaS cho doanh nghiệp

**Mô hình triển khai:** Multi-tenant, phục vụ nhiều workspace/doanh nghiệp trên cùng một nền tảng

**Đối tượng sử dụng:** Doanh nghiệp vừa và lớn có nhu cầu xây dựng trợ lý AI nội bộ dựa trên tài liệu riêng

**Ngôn ngữ chính:** Tiếng Việt, có khả năng mở rộng sang tiếng Anh và đa ngôn ngữ

**Trạng thái mục tiêu:** Production-ready

Tina Chatbot là nền tảng trợ lý AI cho doanh nghiệp, cho phép mỗi doanh nghiệp xây dựng hệ thống hỏi đáp nội bộ dựa trên tài liệu tri thức của mình. Hệ thống sử dụng mô hình RAG để kết hợp năng lực của mô hình ngôn ngữ lớn với dữ liệu riêng của từng workspace, giúp người dùng nhận được câu trả lời có căn cứ, có kiểm soát quyền truy cập và phù hợp với bối cảnh tổ chức.

Điểm cốt lõi của dự án là khả năng quản lý tri thức theo cây phân cấp, kiểm soát quyền theo vai trò, phân tách dữ liệu giữa các tenant và giới hạn phạm vi hiểu biết của từng AI Assistant theo vùng tri thức được cấp quyền.

---

## 2. Bối Cảnh Và Vấn Đề Cần Giải Quyết

Trong nhiều doanh nghiệp, tài liệu nội bộ thường phân tán ở nhiều nơi như file PDF, Word, Google Drive, Notion, hệ thống quản lý quy trình, email hoặc các kho tài liệu phòng ban. Nhân viên khó tìm đúng thông tin, mất nhiều thời gian hỏi lại bộ phận phụ trách, trong khi kiến thức quan trọng thường chỉ nằm trong tài liệu dài hoặc trong kinh nghiệm của một số cá nhân.

Các chatbot AI phổ thông có thể trả lời tốt các câu hỏi chung nhưng không hiểu dữ liệu riêng của doanh nghiệp. Nếu đưa toàn bộ dữ liệu nội bộ vào một chatbot duy nhất mà không kiểm soát quyền, hệ thống dễ phát sinh rủi ro rò rỉ thông tin giữa phòng ban, giữa cấp quản lý và nhân viên, hoặc giữa các khách hàng trên cùng nền tảng SaaS.

Tina Chatbot giải quyết vấn đề này bằng cách cung cấp một nền tảng AI nội bộ có kiểm soát, nơi dữ liệu được tổ chức, phân quyền, lập chỉ mục, truy xuất và sử dụng theo đúng phạm vi của từng người dùng, từng assistant và từng workspace.

---

## 3. Mục Tiêu Dự Án

Mục tiêu của Tina Chatbot là xây dựng một nền tảng Chatbot RAG an toàn, dễ mở rộng và có thể vận hành thực tế trong môi trường doanh nghiệp.

Các mục tiêu chính gồm:

- Cho phép doanh nghiệp tạo trợ lý AI dựa trên tài liệu nội bộ của riêng mình.
- Đảm bảo dữ liệu giữa các workspace được cô lập tuyệt đối.
- Cung cấp hệ thống phân quyền rõ ràng theo vai trò và theo cây tri thức.
- Cho phép cấu hình nhiều AI Assistant với phạm vi tri thức khác nhau.
- Hỗ trợ quản trị tài liệu, người dùng, phân quyền, phiên chat và giám sát hoạt động.
- Đảm bảo câu trả lời của AI có căn cứ từ tài liệu được truy xuất.
- Hạn chế hallucination bằng RAG, guardrail, logging và cơ chế kiểm soát nguồn tri thức.
- Đáp ứng yêu cầu production về bảo mật, giám sát, audit log, khả năng mở rộng và độ ổn định.

---

## 4. Mục Đích Sử Dụng

Tina Chatbot được thiết kế để phục vụ các kịch bản thực tế trong doanh nghiệp như:

- Trợ lý nhân sự trả lời chính sách nghỉ phép, bảo hiểm, tuyển dụng, onboarding.
- Trợ lý IT hướng dẫn quy trình cấp tài khoản, xử lý sự cố, vận hành hệ thống.
- Trợ lý pháp chế tra cứu hợp đồng mẫu, quy định nội bộ, chính sách tuân thủ.
- Trợ lý bán hàng tra cứu thông tin sản phẩm, bảng giá, chính sách chiết khấu.
- Trợ lý chăm sóc khách hàng hỗ trợ nhân viên trả lời theo tài liệu chuẩn.
- Trợ lý quản lý hỗ trợ tra cứu nhanh quy trình, báo cáo, tài liệu điều hành.
- Bot công khai cho ứng viên hoặc khách hàng, chỉ được truy cập một phần tri thức đã chọn.

Mỗi assistant có thể được giới hạn vào một node tri thức cụ thể. Ví dụ, assistant HR chỉ truy cập tài liệu nhân sự, assistant IT chỉ truy cập tài liệu công nghệ, còn assistant cấp lãnh đạo có thể truy cập toàn bộ cây tri thức nếu được cấp quyền.

---

## 5. Phạm Vi Dự Án

### 5.1. Phạm Vi Trong Giai Đoạn Production Đầu Tiên

- Quản lý workspace/tenant.
- Quản lý người dùng và vai trò.
- Quản lý cây thư mục tri thức.
- Upload, lưu trữ, xử lý và lập chỉ mục tài liệu.
- Tạo và cấu hình AI Assistant.
- Gán assistant với vùng tri thức cụ thể.
- Chat với assistant theo quyền truy cập.
- Truy xuất tài liệu bằng RAG.
- Lưu metadata phiên chat và lịch sử hội thoại của chính người dùng.
- Audit log các thao tác nhạy cảm.
- Dashboard cơ bản cho quản trị workspace và quản trị hệ thống.
- Giám sát pipeline ingest và chất lượng retrieval.

### 5.2. Ngoài Phạm Vi Ban Đầu

- Tự huấn luyện mô hình LLM riêng từ đầu.
- Thay thế hoàn toàn hệ thống quản trị tài liệu hiện hữu của doanh nghiệp.
- Xây dựng workflow automation phức tạp như BPM/ERP.
- Hỗ trợ tác vụ ghi dữ liệu trực tiếp vào hệ thống nghiệp vụ bên thứ ba khi chưa có kiểm soát phê duyệt.
- Cho phép AI tự ý truy cập dữ liệu ngoài vùng được phân quyền.

---

## 6. Người Dùng Và Vai Trò

### 6.1. Super Admin

Super Admin là quản trị viên cao nhất của nền tảng SaaS. Vai trò này có quyền quản lý toàn bộ workspace, tài nguyên hệ thống, model AI, cấu hình nền tảng, tài khoản quản trị và can thiệp dữ liệu khẩn cấp khi có sự cố.

### 6.2. System Admin

System Admin chịu trách nhiệm vận hành nền tảng, giám sát pipeline ingest, theo dõi chất lượng RAG, hỗ trợ workspace và quản lý chính sách hệ thống theo phạm vi được Super Admin cấp.

### 6.3. Workspace Owner

Workspace Owner là quản trị viên cao nhất trong một doanh nghiệp. Vai trò này quản lý người dùng, tài liệu, cây tri thức, assistant, phân quyền nội bộ và các cấu hình RAG ở cấp workspace. Workspace Owner không được tự ý chỉnh sửa system prompt cấp nền tảng.

### 6.4. Employee

Employee là người dùng cuối trong doanh nghiệp. Người dùng này có thể chat với các assistant được gán, xem tài liệu trong phạm vi được cấp quyền và quản lý phiên chat của chính mình.

---

## 7. Chức Năng Chính

### 7.1. Quản Lý Workspace

Hệ thống cho phép tạo, cập nhật, khóa, mở khóa và cấu hình quota cho từng workspace. Mỗi workspace có dữ liệu, người dùng, tài liệu, assistant và cấu hình riêng biệt. Dữ liệu giữa các workspace không được truy cập chéo.

### 7.2. Quản Lý Người Dùng Và Phân Quyền

Workspace Owner có thể tạo người dùng, cập nhật trạng thái, reset mật khẩu, gán vai trò và phân quyền truy cập thư mục. Hệ thống sử dụng RBAC để kiểm soát quyền hành động, đồng thời dùng phân quyền theo cây để kiểm soát phạm vi dữ liệu.

### 7.3. Quản Lý Cây Tri Thức

Tài liệu được tổ chức theo cấu trúc cây, đại diện cho phòng ban, domain, nhóm nghiệp vụ hoặc phạm vi sử dụng. Khi người dùng hoặc assistant được cấp quyền tại một node, quyền có thể mở rộng xuống các node con tùy theo chính sách kế thừa.

### 7.4. Quản Lý Tài Liệu

Người quản trị có thể upload tài liệu, phân loại vào thư mục, xem trạng thái xử lý, xóa tài liệu và kiểm tra metadata. Hệ thống hỗ trợ các định dạng phổ biến như PDF, DOCX, XLSX, PPTX, TXT, Markdown, HTML và CSV.

Sau khi upload, tài liệu được đưa vào pipeline xử lý gồm đọc nội dung bằng Docling, chuyển tài liệu phi cấu trúc thành dạng có cấu trúc, làm sạch, chia chunk, tạo embedding, lưu vector và ghi nhận metadata phục vụ truy xuất.

### 7.5. Quản Lý AI Assistant

Workspace Owner có thể tạo nhiều AI Assistant cho các mục đích khác nhau. Mỗi assistant có tên, mô tả, avatar, cấu hình mô hình, tham số RAG, vùng tri thức được phép truy cập và danh sách người dùng hoặc nhóm người dùng được phép sử dụng.

System Admin hoặc Super Admin có thể kiểm soát các prompt hệ thống, guardrail và chính sách AI để đảm bảo assistant hoạt động an toàn, nhất quán và không vượt quyền.

### 7.6. Chat Và Truy Vấn RAG

Người dùng có thể tạo phiên chat và gửi câu hỏi tới assistant được cấp quyền. Khi nhận câu hỏi, hệ thống xác định workspace, người dùng, assistant, quyền truy cập, vùng tri thức hợp lệ, sau đó thực hiện truy xuất vector theo metadata filter.

Câu trả lời được tạo dựa trên các đoạn tài liệu liên quan. Hệ thống ưu tiên trả lời có nguồn tham chiếu, hạn chế suy đoán và thông báo rõ khi không tìm thấy dữ liệu phù hợp.

### 7.7. Lịch Sử Chat Và Quyền Riêng Tư

Người dùng có thể xem lịch sử hội thoại của chính mình. Workspace Owner có thể xem metadata phiên chat phục vụ quản trị như thời gian, assistant, người dùng và số lượng tin nhắn, nhưng không được xem nội dung hội thoại của người khác nếu không có chính sách đặc biệt được phê duyệt.

### 7.8. Audit Log

Hệ thống ghi nhận các thao tác quan trọng như đăng nhập, upload tài liệu, xóa tài liệu, thay đổi phân quyền, cập nhật assistant, thay đổi cấu hình RAG, khóa người dùng và thao tác hỗ trợ kỹ thuật. Audit log phục vụ kiểm tra bảo mật, truy vết sự cố và tuân thủ nội bộ.

### 7.9. Giám Sát Và Vận Hành

Nền tảng cung cấp dashboard để theo dõi trạng thái ingest, lỗi pipeline, dung lượng sử dụng, độ trễ truy vấn, tỷ lệ lỗi, số lượng phiên chat, mức sử dụng model và chất lượng retrieval. System Admin có thể dùng các thông tin này để xử lý sự cố và tối ưu hệ thống.

---

## 8. Yêu Cầu Phi Chức Năng

### 8.1. Bảo Mật

- Cô lập dữ liệu giữa các tenant.
- Mã hóa dữ liệu nhạy cảm khi lưu trữ và khi truyền tải.
- Kiểm soát truy cập bằng RBAC và phân quyền theo cây.
- Hỗ trợ đăng nhập bằng email/mật khẩu và có thể mở rộng sang SSO.
- Ghi audit log cho thao tác nhạy cảm.
- Không cho phép AI truy xuất tài liệu ngoài phạm vi được cấp quyền.

### 8.2. Hiệu Năng

- Truy vấn chat thông thường nên phản hồi trong vài giây.
- Pipeline ingest xử lý bất đồng bộ để không chặn trải nghiệm người dùng.
- Vector search cần hỗ trợ metadata filter theo workspace, folder, document và permission scope.
- Hệ thống có thể scale riêng phần API, worker, vector database và LLM gateway.

### 8.3. Khả Năng Mở Rộng

- Hỗ trợ nhiều workspace độc lập.
- Hỗ trợ nhiều assistant trong cùng một workspace.
- Hỗ trợ mở rộng loại tài liệu, nguồn dữ liệu và model AI.
- Kiến trúc tách biệt giữa web app, API, worker, storage, vector database và observability.

### 8.4. Độ Tin Cậy

- Job ingest có khả năng retry khi lỗi tạm thời.
- Lỗi xử lý tài liệu phải được ghi nhận rõ ràng để quản trị viên xử lý.
- Hệ thống cần có health check, logging, tracing và cảnh báo.
- Các thao tác nhạy cảm cần được kiểm tra quyền ở tầng backend, không chỉ ở giao diện.

### 8.5. Tuân Thủ Và Quyền Riêng Tư

- Nội dung hội thoại và tài liệu nội bộ phải được bảo vệ theo chính sách workspace.
- Workspace Owner không mặc định được xem nội dung chat cá nhân của nhân viên.
- Dữ liệu dùng cho phân tích chất lượng cần được ẩn danh hoặc giới hạn theo chính sách.
- Có cơ chế xóa hoặc vô hiệu hóa dữ liệu theo yêu cầu của khách hàng.

---

## 9. Kiến Trúc Tổng Quan

Tina Chatbot được thiết kế theo mô hình client-server, trong đó client là web application và server là hệ thống backend chịu trách nhiệm xử lý toàn bộ nghiệp vụ, bảo mật, phân quyền, dữ liệu và AI. Ở phía server, backend được chia thành hai khối chính để tối ưu theo đặc thù công nghệ: Core Backend cho nghiệp vụ SaaS và AI Backend cho xử lý RAG.

Với mô hình này, frontend không gọi trực tiếp AI Backend, vector database, database hoặc storage. Mọi request từ client đều đi qua Core Backend. Core Backend là server chính, là nơi xác thực người dùng, kiểm tra quyền, xác định phạm vi dữ liệu hợp lệ và điều phối các tác vụ AI nội bộ.

Các thành phần chính gồm:

- Web Application cho người dùng cuối và quản trị viên.
- Core Backend xử lý nghiệp vụ, phân quyền, chat, quản lý tài liệu, workspace và audit log.
- AI Backend xử lý RAG, ingest tài liệu, chuyển đổi tài liệu bằng Docling, chunking, embedding, vector search, reranking và gọi LLM.
- Authentication Service quản lý đăng nhập, phiên người dùng và token.
- AI Worker xử lý tài liệu bất đồng bộ, bao gồm parse file bằng Docling và chuẩn hóa nội dung trước khi lập chỉ mục.
- RAG Orchestrator điều phối truy xuất vector, rerank, prompt assembly và gọi LLM trong phạm vi được Core Backend cấp.
- MinIO Object Storage lưu file gốc và file đã xử lý.
- Relational Database lưu dữ liệu nghiệp vụ, phân quyền, cấu hình và audit log.
- Qdrant Vector Database lưu embedding và metadata phục vụ semantic search.
- Queue System điều phối các job nặng như ingest, embedding và indexing.
- Observability Stack phục vụ logging, metrics, tracing và alerting.

Quan hệ giữa các thành phần:

```text
Client Web Application
        |
        v
Core Backend - NestJS
        |
        |-- PostgreSQL
        |-- Redis
        |-- MinIO Object Storage
        |-- Queue System
        |
        v
AI Backend / AI Worker - Python
        |
        |-- Qdrant Vector Database
        |-- Embedding Model
        |-- Reranker
        |-- LLM Provider
```

Core Backend là nguồn quyết định quyền truy cập và là source of truth cho nghiệp vụ. AI Backend không tự quyết định user được xem tài liệu nào, không tự cấp quyền và không được client gọi trực tiếp. AI Backend chỉ xử lý trong phạm vi dữ liệu đã được Core Backend xác định, ví dụ `workspace_id`, `assistant_id`, `allowed_folder_ids`, `allowed_document_ids`, `top_k` và cấu hình RAG hợp lệ.

Luồng chat cơ bản:

1. Người dùng gửi câu hỏi tới assistant.
2. Client gọi Core Backend thông qua API hoặc streaming endpoint.
3. Core Backend kiểm tra danh tính, workspace, vai trò và quyền sử dụng assistant.
4. Core Backend xác định danh sách folder hợp lệ theo cấu hình assistant và quyền người dùng.
5. Core Backend gọi AI Backend với phạm vi dữ liệu đã được kiểm soát.
6. AI Backend truy xuất vector với metadata filter, rerank kết quả và xây dựng context.
7. LLM tạo câu trả lời dựa trên context hợp lệ.
8. Core Backend lưu phiên chat, metadata truy xuất, nguồn tham chiếu và log phục vụ giám sát.
9. Core Backend trả kết quả về client.

Luồng ingest tài liệu cơ bản:

1. Workspace Owner upload tài liệu từ client.
2. Client gửi file tới Core Backend.
3. Core Backend kiểm tra quyền `workspace:document:manage`.
4. Core Backend lưu file vào MinIO Object Storage, tạo document record và tạo ingestion job.
5. Queue System chuyển job cho AI Worker.
6. AI Worker dùng Docling để đọc file, trích xuất nội dung, nhận diện cấu trúc tài liệu, chuẩn hóa thành dạng có cấu trúc, chia chunk, tạo embedding và lưu vào Qdrant Vector Database.
7. AI Worker cập nhật trạng thái xử lý để Core Backend hiển thị cho người quản trị.

---

## 10. Tech Stack Đề Xuất

### 10.1. Frontend

- Next.js cho web application.
- React cho giao diện tương tác.
- TypeScript để tăng độ an toàn mã nguồn.
- Tailwind CSS cho styling nhanh và nhất quán.
- shadcn/ui hoặc hệ thống design component nội bộ cho UI quản trị.

### 10.2. Backend

- Core Backend sử dụng NestJS cho nghiệp vụ SaaS, quản trị workspace, user, RBAC, folder, document metadata, assistant, chat session và audit log.
- Core Backend là server chính mà frontend giao tiếp trực tiếp trong mô hình client-server.
- AI Backend sử dụng Python cho RAG, ingest tài liệu, Docling document conversion, chunking, embedding, vector search, reranking, guardrail và gọi LLM.
- AI Worker sử dụng cùng codebase Python với AI Backend nhưng chạy dưới dạng worker bất đồng bộ cho các tác vụ nặng.
- REST API dùng cho các nghiệp vụ quản trị, cấu hình và chat cơ bản.
- Server-Sent Events hoặc WebSocket dùng cho streaming câu trả lời AI từ Core Backend về client.
- HTTP nội bộ hoặc gRPC dùng cho giao tiếp giữa Core Backend và AI Backend.
- Queue như Redis Queue, BullMQ, RabbitMQ hoặc Kafka dùng cho job ingest, embedding và reindex.
- OpenAPI dùng để chuẩn hóa tài liệu API của Core Backend.

### 10.3. Database Và Storage

- PostgreSQL cho dữ liệu nghiệp vụ, phân quyền, workspace, assistant, session và audit log.
- Redis cho cache, rate limit, session phụ trợ và hàng đợi nhẹ.
- MinIO làm S3-compatible Object Storage cho file tài liệu gốc và file đã xử lý.
- Qdrant làm vector database cho embedding, metadata filter, semantic search và retrieval.

### 10.4. AI Và RAG

- OpenAI, Azure OpenAI hoặc model provider tương thích chuẩn OpenAI API.
- Embedding model hỗ trợ tiếng Việt và tiếng Anh.
- Reranker model để cải thiện chất lượng retrieval.
- Docling dùng để xử lý tài liệu phi cấu trúc như PDF, DOCX, PPTX, HTML hoặc tài liệu scan thành dạng có cấu trúc phục vụ chunking và indexing.
- LangChain, LlamaIndex hoặc custom RAG pipeline tùy mức độ kiểm soát mong muốn.
- Guardrail để kiểm soát prompt injection, nội dung nhạy cảm và câu trả lời ngoài phạm vi.

### 10.5. Hạ Tầng

- Docker cho đóng gói ứng dụng.
- Kubernetes cho triển khai production có khả năng scale.
- Nginx hoặc cloud load balancer cho routing và TLS termination.
- Terraform cho quản lý hạ tầng dạng Infrastructure as Code.
- GitHub Actions hoặc GitLab CI cho CI/CD.

### 10.6. Observability Và Bảo Mật

- Prometheus và Grafana cho metrics.
- Loki hoặc ELK Stack cho log tập trung.
- OpenTelemetry cho tracing.
- Sentry cho error tracking.
- Vault hoặc cloud secret manager cho quản lý secret.
- WAF, rate limiting và IP allowlist cho các endpoint quản trị nhạy cảm.

---

## 11. Mô Hình Dữ Liệu Khái Niệm

Các thực thể chính của hệ thống gồm:

- Workspace: đại diện cho một doanh nghiệp hoặc tenant.
- User: người dùng thuộc một workspace hoặc nhóm quản trị nền tảng.
- Role: vai trò hệ thống như Super Admin, System Admin, Workspace Owner, Employee.
- Permission: quyền thao tác cụ thể trong hệ thống.
- Folder: node trong cây tri thức.
- Document: tài liệu được upload vào workspace.
- Document Chunk: đoạn nội dung nhỏ được tạo từ tài liệu để embedding.
- Assistant: AI Assistant được cấu hình cho một mục đích cụ thể.
- Assistant Knowledge Source: ánh xạ giữa assistant và các folder được phép truy cập.
- Chat Session: phiên hội thoại giữa người dùng và assistant.
- Chat Message: từng tin nhắn trong phiên chat.
- Audit Log: nhật ký thao tác quan trọng.
- Ingestion Job: job xử lý tài liệu bất đồng bộ.

---

## 12. Nguyên Tắc Thiết Kế Sản Phẩm

- An toàn dữ liệu là ưu tiên cao nhất.
- Mọi truy xuất tri thức phải đi qua kiểm tra workspace, user, assistant và folder scope.
- AI chỉ được trả lời trong phạm vi dữ liệu được phép.
- Người dùng cần biết khi AI không có đủ dữ liệu để trả lời.
- Quản trị viên cần có khả năng truy vết vì sao AI đưa ra một câu trả lời.
- Tài liệu, quyền và assistant phải dễ quản lý với người không chuyên kỹ thuật.
- Hệ thống cần thiết kế để mở rộng nhiều tenant ngay từ đầu.

---

## 13. Tiêu Chí Thành Công

Dự án được xem là thành công khi đạt các tiêu chí sau:

- Doanh nghiệp có thể tự tạo workspace, upload tài liệu và tạo assistant phục vụ nội bộ.
- Người dùng nhận được câu trả lời chính xác, có căn cứ và đúng phạm vi quyền.
- Dữ liệu giữa các workspace không bị truy cập chéo.
- Workspace Owner quản lý được người dùng, tài liệu, assistant và phân quyền mà không cần can thiệp kỹ thuật sâu.
- System Admin có đủ công cụ để giám sát ingest, retrieval, lỗi và audit log.
- Hệ thống vận hành ổn định trong môi trường production với logging, monitoring và cơ chế xử lý lỗi rõ ràng.

---

## 14. Định Hướng Phát Triển Tương Lai

- Tích hợp SSO với Google Workspace, Microsoft Entra ID và Okta.
- Kết nối nguồn dữ liệu ngoài như Google Drive, SharePoint, Notion, Confluence và Slack.
- Hỗ trợ workflow phê duyệt khi AI thực hiện hành động nhạy cảm.
- Cho phép đánh giá chất lượng câu trả lời bằng feedback của người dùng.
- Tự động phát hiện tài liệu lỗi thời hoặc mâu thuẫn.
- Hỗ trợ fine-tuning hoặc instruction tuning cho các domain đặc thù.
- Thêm analytics chuyên sâu về mức độ sử dụng tri thức trong doanh nghiệp.
- Hỗ trợ triển khai dedicated cloud hoặc on-premise cho khách hàng yêu cầu bảo mật cao.
