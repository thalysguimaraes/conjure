import { LaunchProps } from "@raycast/api";
import { runCreateImageFromContext, CreateImageJobContext } from "./create-image";
import { runEditImageFromContext, EditImageJobContext } from "./edit-image";
import { runUpscaleFromContext, UpscaleJobContext } from "./upscale-image";
import { runCreateVideoFromContext, CreateVideoJobContext } from "./create-video";
import { notifyMacOS } from "./notify";

export type JobContext = CreateImageJobContext | EditImageJobContext | UpscaleJobContext | CreateVideoJobContext;

export default async function Worker(props: LaunchProps<{ launchContext?: JobContext }>): Promise<void> {
  const ctx = props.launchContext;
  if (!ctx) {
    await notifyMacOS("Conjure", "Run Create Image, Edit Image, Upscale Image, or Create Video to start a job.", {
      subtitle: "Worker has no job context",
    });
    return;
  }

  switch (ctx.command) {
    case "create-image":
      await runCreateImageFromContext(ctx);
      return;
    case "edit-image":
      await runEditImageFromContext(ctx);
      return;
    case "upscale-image":
      await runUpscaleFromContext(ctx);
      return;
    case "create-video":
      await runCreateVideoFromContext(ctx);
      return;
  }
}
