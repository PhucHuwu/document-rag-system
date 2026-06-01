import { PrismaClient, RoleCode } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function upsertUser(input: {
  email: string;
  name: string;
  password: string;
  role: RoleCode;
  workspaceId?: string;
}) {
  const passwordHash = await hash(input.password, 12);

  return prisma.user.upsert({
    where: { email: input.email },
    update: {
      name: input.name,
      role: input.role,
      workspaceId: input.workspaceId,
      passwordHash,
      status: "active"
    },
    create: {
      email: input.email,
      name: input.name,
      role: input.role,
      workspaceId: input.workspaceId,
      passwordHash,
      status: "active"
    }
  });
}

async function main() {
  const workspace = await prisma.workspace.upsert({
    where: { slug: "demo" },
    update: { name: "Tina Demo Company", status: "active" },
    create: { name: "Tina Demo Company", slug: "demo", status: "active" }
  });

  const superAdmin = await upsertUser({
    email: "super@tina.local",
    name: "Super Admin",
    password: "Password123!",
    role: "super_admin"
  });

  const owner = await upsertUser({
    email: "owner@tina.local",
    name: "Workspace Owner",
    password: "Password123!",
    role: "workspace_owner",
    workspaceId: workspace.id
  });

  const hrUser = await upsertUser({
    email: "hr@tina.local",
    name: "HR Employee",
    password: "Password123!",
    role: "employee",
    workspaceId: workspace.id
  });

  const itUser = await upsertUser({
    email: "it@tina.local",
    name: "IT Employee",
    password: "Password123!",
    role: "employee",
    workspaceId: workspace.id
  });

  const root = await prisma.folder.upsert({
    where: { id: "folder_root" },
    update: { workspaceId: workspace.id, parentId: null, name: "Tri thức công ty" },
    create: { id: "folder_root", workspaceId: workspace.id, parentId: null, name: "Tri thức công ty" }
  });

  const hr = await prisma.folder.upsert({
    where: { id: "folder_hr" },
    update: { workspaceId: workspace.id, parentId: root.id, name: "HR" },
    create: { id: "folder_hr", workspaceId: workspace.id, parentId: root.id, name: "HR" }
  });

  await prisma.folder.upsert({
    where: { id: "folder_hr_policy" },
    update: { workspaceId: workspace.id, parentId: hr.id, name: "Chính sách nhân sự" },
    create: { id: "folder_hr_policy", workspaceId: workspace.id, parentId: hr.id, name: "Chính sách nhân sự" }
  });

  await prisma.folder.upsert({
    where: { id: "folder_recruitment" },
    update: { workspaceId: workspace.id, parentId: hr.id, name: "Tuyển dụng" },
    create: { id: "folder_recruitment", workspaceId: workspace.id, parentId: hr.id, name: "Tuyển dụng" }
  });

  const it = await prisma.folder.upsert({
    where: { id: "folder_it" },
    update: { workspaceId: workspace.id, parentId: root.id, name: "IT" },
    create: { id: "folder_it", workspaceId: workspace.id, parentId: root.id, name: "IT" }
  });

  await prisma.folder.upsert({
    where: { id: "folder_it_ops" },
    update: { workspaceId: workspace.id, parentId: it.id, name: "Quy trình vận hành" },
    create: { id: "folder_it_ops", workspaceId: workspace.id, parentId: it.id, name: "Quy trình vận hành" }
  });

  for (const item of [
    { userId: owner.id, folderId: root.id },
    { userId: hrUser.id, folderId: hr.id },
    { userId: itUser.id, folderId: it.id }
  ]) {
    await prisma.folderAccessControl.upsert({
      where: { userId_folderId_accessType: { userId: item.userId, folderId: item.folderId, accessType: "read" } },
      update: {},
      create: { workspaceId: workspace.id, userId: item.userId, folderId: item.folderId, accessType: "read" }
    });
  }

  const companyAssistant = await prisma.assistant.upsert({
    where: { id: "asst_company" },
    update: { workspaceId: workspace.id, name: "Trợ lý Công ty", status: "active", topK: 40, rerankTopN: 8 },
    create: { id: "asst_company", workspaceId: workspace.id, name: "Trợ lý Công ty", status: "active", topK: 40, rerankTopN: 8 }
  });

  const hrAssistant = await prisma.assistant.upsert({
    where: { id: "asst_hr" },
    update: { workspaceId: workspace.id, name: "Trợ lý HR", status: "active", topK: 40, rerankTopN: 8 },
    create: { id: "asst_hr", workspaceId: workspace.id, name: "Trợ lý HR", status: "active", topK: 40, rerankTopN: 8 }
  });

  const itAssistant = await prisma.assistant.upsert({
    where: { id: "asst_it" },
    update: { workspaceId: workspace.id, name: "Trợ lý IT", status: "active", topK: 40, rerankTopN: 8 },
    create: { id: "asst_it", workspaceId: workspace.id, name: "Trợ lý IT", status: "active", topK: 40, rerankTopN: 8 }
  });

  for (const item of [
    { assistantId: companyAssistant.id, folderId: root.id },
    { assistantId: hrAssistant.id, folderId: hr.id },
    { assistantId: itAssistant.id, folderId: it.id }
  ]) {
    await prisma.assistantKnowledgeSource.upsert({
      where: { assistantId_folderId: item },
      update: {},
      create: { workspaceId: workspace.id, assistantId: item.assistantId, folderId: item.folderId }
    });
  }

  for (const item of [
    { assistantId: companyAssistant.id, userId: owner.id },
    { assistantId: hrAssistant.id, userId: owner.id },
    { assistantId: hrAssistant.id, userId: hrUser.id },
    { assistantId: itAssistant.id, userId: owner.id },
    { assistantId: itAssistant.id, userId: itUser.id }
  ]) {
    await prisma.assistantAssignment.upsert({
      where: { assistantId_userId: item },
      update: {},
      create: { workspaceId: workspace.id, assistantId: item.assistantId, userId: item.userId }
    });
  }

  await prisma.auditLog.create({
    data: {
      actorUserId: superAdmin.id,
      action: "dev.seed",
      targetType: "workspace",
      targetId: workspace.id,
      metadata: { seededUsers: [owner.email, hrUser.email, itUser.email] }
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
