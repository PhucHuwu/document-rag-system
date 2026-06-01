# Tài Liệu Thiết Kế Chi Tiết Phân Quyền Hệ Thống Chatbot RAG
## RBAC & Hierarchical Access Control 

---

## 1. Tổng Quan Kiến Trúc

Hệ thống quản lý Chatbot RAG được thiết kế để phục vụ mô hình **Multi-tenant (SaaS)**, nơi một nền tảng (Platform) cung cấp dịch vụ cho nhiều doanh nghiệp (Workspace/Tenant).

Hệ thống phân quyền được xây dựng dựa trên sự kết hợp của hai mô hình:

1. **RBAC (Role-Based Access Control):** Kiểm soát quyền thực thi các hành động chức năng (Tạo, Sửa, Xóa, Cấu hình) dựa trên vai trò của người dùng.
2. **Hierarchical Access Control (Phân cấp dữ liệu theo cây):** Kiểm soát luồng dữ liệu (tài liệu tri thức) và năng lực của các AI Assistant dựa trên vị trí của chúng trên cây thư mục phòng ban/domain.

**Nguyên lý cốt lõi:** Quyền nằm ở Node càng cao (gần gốc) → Truy cập được càng nhiều nhánh con → Context của AI càng rộng → AI xử lý được càng nhiều vấn đề.

---

## 2. Mô Hình Vai Trò

Hệ thống phân tách rõ rệt giữa **Nhóm Quản trị Nền tảng** (Platform — Nhà cung cấp) và **Nhóm Doanh nghiệp** (Workspace — Khách hàng).

### 2.1. Cấp Độ Nền Tảng (Platform Level)

- **Super Admin (`super_admin`):** Quản trị viên tối cao của toàn hệ thống SaaS. Có quyền quản lý tất cả các tenant, giới hạn tài nguyên và xử lý sự cố gốc. Là vai trò duy nhất có quyền chỉnh sửa `system_prompt` của AI Assistant (xem Fix #3).
- **System Admin (`system_admin`):** Quản trị viên hệ thống có nhiệm vụ vận hành, thiết lập chính sách (policy) chung, hỗ trợ các tenant và giám sát chất lượng AI. Có quyền chỉnh sửa `system_prompt` theo phân cấp được Super Admin cấp.

### 2.2. Cấp Độ Doanh Nghiệp (Workspace Level)

- **Workspace Owner (`workspace_owner` / Admin Công ty):** Quản trị viên cao nhất của một doanh nghiệp. Nắm toàn quyền về tài liệu, nhân sự và cấu hình kỹ thuật RAG (top_k, rerank, chunking) trong nội bộ doanh nghiệp. **Không có quyền chỉnh sửa `system_prompt` của AI Assistant** (xem Fix #3).
- **Employee (`employee` / Nhân viên):** Người dùng cuối trong công ty, sử dụng AI để phục vụ công việc hàng ngày. Chỉ truy cập tài liệu và AI Assistant trong phạm vi được cấp quyền.

---

## 3. Cấu Trúc Cây Tri Thức & Năng Lực AI

### 3.1. Phân Cấp Dữ Liệu

Tri thức của một Workspace được tổ chức theo cấu trúc hình cây (Tree). Quyền truy cập được kế thừa từ trên xuống dưới.

```
Node Gốc (Root — Tri thức công ty)
├── Node 1 (HR — Nhân sự)
│   ├── Node 1.1 (Tuyển dụng)
│   └── Node 1.2 (Chính sách đãi ngộ)
└── Node 2 (IT — Công nghệ thông tin)
    ├── Node 2.1 (Tài liệu kỹ thuật)
    └── Node 2.2 (Quy trình vận hành)
```

### 3.2. Năng Lực của AI Assistant

Năng lực của AI Assistant bị giới hạn bởi **node thư mục mà nó được cấu hình truy cập** thông qua bảng `assistant_knowledge_sources`.

- **Trường hợp 1:** AI gắn vào **Node Gốc** → Truy xuất toàn bộ tài liệu mọi phòng ban. Phù hợp làm "Trợ lý Giám đốc".
- **Trường hợp 2:** AI gắn vào **Node 1 (HR)** → Chỉ truy xuất Node 1, 1.1, 1.2. Nếu hỏi về IT sẽ trả lời không biết. Phù hợp làm "Trợ lý HR".
- **Trường hợp 3:** AI gắn vào **Node 1.1** → Chỉ truy xuất tài liệu tuyển dụng. Phù hợp làm "Bot hỗ trợ ứng viên".

Khi AI thực hiện RAG query, bộ lọc Vector Database (Milvus/Pinecone) được truyền metadata filter: `folder_id IN (ID_node_được_cấp, ID_tất_cả_con_của_node_đó)`.

---

## 4. Ma Trận Phân Quyền (Permission Matrix)

### 4.1. Bảng Quyền Đầy Đủ

| Nhóm Tính Năng           | Permission Code              | Mô Tả Quyền                                                              | Super Admin | System Admin | Workspace Owner | Employee                        |
| ------------------------ | ---------------------------- | ------------------------------------------------------------------------- | :---------: | :----------: | :-------------: | ------------------------------- |
| **Quản trị Nền tảng**    | `platform:workspace:manage`  | Tạo, cập nhật, khoá/mở khoá workspace (tenant) trên toàn nền tảng       | ✅          |              |                 |                                 |
|                          | `platform:owner:assign`      | Gán hoặc thay đổi Workspace Owner cho từng workspace                     | ✅          |              |                 |                                 |
|                          | `platform:resource:manage`   | Thiết lập và điều chỉnh quota tài nguyên (storage, LLM, queue) mỗi workspace | ✅      |              |                 |                                 |
|                          | `platform:dashboard:view`    | Xem dashboard tổng quan toàn hệ thống: health, error rate, latency       | ✅          |              |                 |                                 |
|                          | `platform:model:manage`      | Quản lý danh sách model AI được phép sử dụng trên toàn nền tảng          | ✅          |              |                 |                                 |
|                          | `platform:admin:manage`      | Tạo, khoá, mở khoá, reset mật khẩu tài khoản Super Admin / System Admin | ✅          |              |                 |                                 |
|                          | `platform:system:config`     | Cấu hình logging, monitoring, chuẩn hoá log theo request/session/user ID | ✅          |              |                 |                                 |
|                          | `platform:data:emergency`    | Can thiệp dữ liệu khẩn cấp ở mức toàn nền tảng khi có sự cố             | ✅          |              |                 |                                 |
| **Quản trị Vận hành**    | `system:policy:manage`       | Thiết lập chính sách vận hành chung áp dụng cho các workspace            | ✅          | ✅           |                 |                                 |
|                          | `system:user_policy:manage`  | Áp dụng chính sách role/status chuẩn cho người dùng liên workspace       | ✅          | ✅           |                 |                                 |
|                          | `system:pipeline:monitor`    | Theo dõi tình trạng ingest tài liệu, lỗi pipeline, dung lượng theo tenant | ✅         | ✅           |                 |                                 |
|                          | `system:ai_policy:manage`    | Thiết lập guardrail và model policy áp dụng cho các workspace            | ✅          | ✅           |                 |                                 |
|                          | `system:rag:monitor`         | Theo dõi chỉ số retrieval, tỷ lệ trả lời lỗi, độ trễ RAG toàn hệ thống  | ✅          | ✅           |                 |                                 |
|                          | `system:audit_log:review`    | Xem và rà soát audit log thao tác nhạy cảm trên toàn bộ workspace        | ✅          | ✅           |                 |                                 |
|                          | `system:workspace:support`   | Thực hiện thao tác hỗ trợ kỹ thuật cho workspace theo phân quyền         | ✅          | ✅           |                 |                                 |
| **Quản trị User (Cty)**  | `workspace:user:manage`      | Tạo, cập nhật trạng thái, reset mật khẩu người dùng trong workspace      |             |              | ✅              |                                 |
|                          | `workspace:role:assign`      | Gán vai trò nội bộ cho người dùng trong workspace                        |             |              | ✅              |                                 |
| **Quản trị Tri thức**    | `workspace:document:manage`  | Upload, xoá, preview tài liệu tri thức dùng chung trong workspace        |             |              | ✅              |                                 |
|                          | `workspace:folder:manage`    | Tạo, sửa, xoá thư mục và tổ chức cây tri thức theo domain/phòng ban      |             |              | ✅              |                                 |
|                          | `workspace:folder:assign`    | Phân quyền truy cập thư mục cho người dùng theo phòng ban hoặc chức vụ   |             |              | ✅              |                                 |
|                          | `document:view`              | Xem và đọc nội dung tài liệu trong phạm vi được cấp quyền                |             |              | ✅              | ✅ (Chỉ folder được cấp quyền) |
| **Quản trị AI**          | `workspace:assistant:manage` | Tạo, sửa, xoá AI Assistant và cấu hình thông tin chung                   |             |              | ✅              |                                 |
|                          | `workspace:assistant:assign` | Gán AI Assistant cho người dùng hoặc nhóm người dùng trong workspace     |             |              | ✅              |                                 |
|                          | `workspace:ai:configure`     | Điều chỉnh tham số kỹ thuật RAG: top_k, rerank, chunking, temperature    |             |              | ✅              |                                 |
| **Chat & Tương tác**     | `chat:session:manage`        | Tạo, xem danh sách phiên chat; Owner chỉ xem metadata, không xem nội dung hội thoại của người khác (*) |             |              | ✅              | ✅                              |
|                          | `chat:send_message`          | Gửi tin nhắn tới AI Assistant trong phiên chat                           |             |              | ✅              | ✅ (Chỉ AI được phép)          |
| **Giám sát Nội bộ**      | `workspace:audit_log:view`   | Xem nhật ký thao tác dữ liệu, cấu hình và phân quyền trong workspace     |             |              | ✅              |                                 |

---

## 6. Luồng Hoạt Động Cốt Lõi

### Workflow 1: Phân Quyền Truy Cập Dữ Liệu (với kế thừa cây)

1. Admin tạo thư mục `Tuyển Dụng` (`parent_id` trỏ về `HR`).
2. Admin tạo bản ghi trong `folder_access_controls`: `(folder_id=TuyenDung, user_id=NhanVienA, access_type=READ)`.
3. Khi Nhân viên A gọi `GET /folders`, application layer:
   - Lấy danh sách `folder_id` được cấp trực tiếp cho A.
   - Đệ quy lấy toàn bộ folder con của mỗi folder đó.
   - Trả về danh sách hợp nhất. Folder `HR` cha và `Chính sách đãi ngộ` (nhánh khác) bị ẩn hoàn toàn.

### Workflow 2: Cấp Quyền & Ngữ Cảnh cho AI Assistant

1. Workspace Owner tạo AI Assistant `Chuyên Viên Tuyển Dụng`.
2. Workspace Owner cấu hình `top_k=5`, `chunking_strategy=semantic` thông qua `workspace:ai:configure`.
3. Super Admin (hoặc System Admin) đặt `system_prompt` cho assistant thông qua `system:ai_prompt:manage`.
4. Admin ánh xạ assistant với `folder_id` của `Tuyển Dụng` trong `assistant_knowledge_sources`.
5. Khi AI thực hiện RAG query, vector DB nhận filter: `folder_id IN (ID_TuyenDung, ...ID_con)`, đảm bảo AI không lấy nhầm văn bản từ `Chính sách đãi ngộ` dù cùng phòng HR.

### Workflow 3: Workspace Owner Xem Thống Kê Session

1. Workspace Owner gọi `GET /workspaces/{id}/sessions` → nhận danh sách metadata: session_id, user_id, assistant_id, timestamp, số tin nhắn.
2. Workspace Owner gọi `GET /sessions/{id}/messages` → API kiểm tra `session.user_id != caller.user_id` → trả về `403 Forbidden`.
3. Workspace Owner chỉ có thể xem nội dung tin nhắn của chính mình.

### Workflow 4: Xử Lý Lỗi Bằng Audit Log

1. Nhân viên B phản ánh AI trả lời sai chính sách.
2. System Admin truy cập `audit_logs` và RAG Monitor Dashboard, lọc theo `request_id` / `session_id`.
3. System Admin kiểm tra chunks nào được truy xuất, xem pipeline ingest có lỗi không — nhờ `system:rag:monitor`.
4. Nếu cần can thiệp dữ liệu khẩn cấp (xóa/sửa tài liệu sai), phải leo thang lên Super Admin qua `platform:data:emergency`.

---
