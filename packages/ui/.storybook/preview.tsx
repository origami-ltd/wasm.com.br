import type { Preview } from "@storybook/react";
import React from "react";
import "./tailwind.css";

const preview: Preview = {
  globalTypes: {
    brand: {
      description: "Brand theme",
      toolbar: {
        title: "Brand",
        icon: "paintbrush",
        items: [
          { value: "origami", title: "origami.ltd" },
          { value: "wasm", title: "wasm.com.br" },
          { value: "generals", title: "generals.wasm.com.br" },
          { value: "vice", title: "vicecity.wasm.com.br" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { brand: "wasm" },
  decorators: [
    (Story, context) => (
      <div
        className="ogx-body"
        data-brand={context.globals.brand}
        style={{ padding: 32, minHeight: "100vh" }}
      >
        <Story />
      </div>
    ),
  ],
  parameters: { backgrounds: { disable: true }, layout: "fullscreen" },
};

export default preview;
