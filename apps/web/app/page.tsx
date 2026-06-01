const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export default function HomePage() {
  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">Tina Chatbot</p>
        <h1>Nền tảng Chatbot RAG multi-tenant cho doanh nghiệp.</h1>
        <p className="lead">
          Client chỉ giao tiếp với Core Backend. Core Backend kiểm tra quyền và cấp phạm vi truy xuất trước khi AI Backend thực hiện RAG.
        </p>
        <div className="cards">
          <article>
            <h2>Core Backend</h2>
            <p>NestJS xử lý workspace, RBAC, folder scope, assistant, chat session và audit log.</p>
          </article>
          <article>
            <h2>AI Backend</h2>
            <p>Python xử lý Docling, chunking, embedding, Qdrant retrieval, reranking và LLM.</p>
          </article>
          <article>
            <h2>Data Safety</h2>
            <p>AI chỉ truy xuất trong effective scope do Core Backend xác định.</p>
          </article>
        </div>
        <p className="meta">Core API: {apiUrl}</p>
      </section>
    </main>
  );
}
