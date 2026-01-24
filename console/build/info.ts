import type { Plugin } from "vite";
import gradient from "gradient-string";
import { getPackageSize } from "./utils";
import dayjs, { type Dayjs } from "dayjs";
import duration from "dayjs/plugin/duration";
import boxen, { type Options as BoxenOptions } from "boxen";
dayjs.extend(duration);

const welcomeMessage = gradient(["cyan", "magenta"]).multiline(
  `您好! 欢迎使用 wolf 开源项目`
);

const boxenOptions: BoxenOptions = {
  padding: 0.5,
  borderColor: "cyan",
  borderStyle: "round"
};

export function viteBuildInfo(): Plugin {
  let config: { command: string };
  let startTime: Dayjs;
  let endTime: Dayjs;
  let outDir: string;
  return {
    name: "vite:buildInfo",
    configResolved(resolvedConfig) {
      config = resolvedConfig;
      outDir = resolvedConfig.build?.outDir ?? "dist";
    },
    buildStart() {
      console.log(boxen(welcomeMessage, boxenOptions));
      if (config.command === "build") {
        startTime = dayjs(new Date());
      }
    },
    closeBundle() {
      if (config.command === "build") {
        endTime = dayjs(new Date());
        getPackageSize({
          folder: outDir,
          callback: (size: string) => {
            console.log(
              boxen(
                gradient(["cyan", "magenta"]).multiline(
                  `🎉 恭喜打包完成（总用时${dayjs
                    .duration(endTime.diff(startTime))
                    .format("mm分ss秒")}，打包后的大小为${size}）`
                ),
                boxenOptions
              )
            );
          }
        });
      }
    }
  };
}
