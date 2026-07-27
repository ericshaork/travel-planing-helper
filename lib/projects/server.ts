import type { User } from "@supabase/supabase-js";

import { createDevelopmentProjectRepository } from "./dev-repository";
import { createProjectRepository } from "./repository";
import { createProjectService } from "./service";
import { isDevelopmentGuestProjectBypassEnabled } from "./dev-bypass";
import {
  createSupabaseAccessTokenClient,
  createSupabaseServiceRoleClient,
} from "../supabase/server";
import { AppError } from "../utils/errors";

const DEVELOPMENT_GUEST_PROJECT_EMAIL =
  "wanderly-dev-guest@local.wanderly.test";

type MinimalProjectUser = Pick<User, "id" | "email">;

export function getBearerToken(request: Request) {
  const authorizationHeader = request.headers.get("authorization");

  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(" ");

  if (scheme?.toLowerCase() !== "bearer" || !token?.trim()) {
    return null;
  }

  return token.trim();
}

async function ensureDevelopmentGuestProjectUser() {
  const client = createSupabaseServiceRoleClient();
  const listResult = await client.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });

  if (listResult.error) {
    throw new AppError(
      "UNKNOWN_ERROR",
      "开发环境游客调试已开启，但现在没法读取测试账号。",
      listResult.error,
    );
  }

  const existingUser = listResult.data.users.find(
    (user) => user.email?.toLowerCase() === DEVELOPMENT_GUEST_PROJECT_EMAIL,
  );

  if (existingUser) {
    return {
      client,
      user: {
        id: existingUser.id,
        email: existingUser.email ?? DEVELOPMENT_GUEST_PROJECT_EMAIL,
      } satisfies MinimalProjectUser,
    };
  }

  const createResult = await client.auth.admin.createUser({
    email: DEVELOPMENT_GUEST_PROJECT_EMAIL,
    email_confirm: true,
    user_metadata: {
      wanderlyDevGuest: true,
      createdFor: "local-create-copilot-debug",
    },
  });

  if (createResult.error || !createResult.data.user) {
    throw new AppError(
      "UNKNOWN_ERROR",
      "开发环境游客调试已开启，但临时测试账号创建失败了。",
      createResult.error,
    );
  }

  return {
    client,
    user: {
      id: createResult.data.user.id,
      email: createResult.data.user.email ?? DEVELOPMENT_GUEST_PROJECT_EMAIL,
    } satisfies MinimalProjectUser,
  };
}

function createDevelopmentGuestProjectContext(user: MinimalProjectUser) {
  return {
    accessToken: null,
    client: null,
    user,
    isDevelopmentGuest: true,
    service: createProjectService(createDevelopmentProjectRepository()),
  };
}

export async function resolveAuthenticatedProjectContext(
  request: Request,
  createClient = createSupabaseAccessTokenClient,
) {
  const accessToken = getBearerToken(request);

  if (!accessToken) {
    if (!isDevelopmentGuestProjectBypassEnabled()) {
      throw new AppError("UNAUTHORIZED", "请先登录，再继续这个旅行项目操作。");
    }

    const developmentGuestContext =
      await ensureDevelopmentGuestProjectUser();

    return createDevelopmentGuestProjectContext(developmentGuestContext.user);
  }

  const client = createClient(accessToken);
  const {
    data: { user },
    error,
  } = await client.auth.getUser(accessToken);

  if (error || !user) {
    throw new AppError("UNAUTHORIZED", "当前登录状态已经失效，请重新登录后再试。");
  }

  return {
    accessToken,
    client,
    user,
    isDevelopmentGuest: false,
    service: createProjectService(createProjectRepository(client as never)),
  };
}
