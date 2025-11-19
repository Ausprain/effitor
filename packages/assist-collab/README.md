# assist-collab

协作助手，主要目的是，在桌面应用中，多个窗口打开同一个 md 文件，能够在各窗口之间同步内容；其次，是协同编辑。

主要思路：[CaretPath](/packages/core/src/selection/CaretPath.ts)

继承 core 导出的 CommandManager，覆盖 handle 方法，将执行成功的命令给同步出去。
命令执行位置（光标/选区）使用 CaretPath 作为同步接口，插入的内容转义为特定的抽象节点结构，通过 json 传输。

```ts
class CollabCommandManager extends CommandManager {}

const useCollabAssist = () => {
  return {
    effector: {
      onMounted(ctx) {
        ctx.commandManager = new CollabCommandManager();
      },
    },
  };
};
```
