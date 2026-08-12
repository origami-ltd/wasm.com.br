import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { Button, Card, GameBox, Kicker, OrigamiBrand, TopNav } from "../src/react";

const meta: Meta = { title: "Components" };
export default meta;

export const Cards: StoryObj = {
  render: () => (
    <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
      <Card title="Preservation">Games outlive the platforms they were written for.</Card>
      <Card title="Your copy, your files">Nothing is redistributed; assets stream from your disk.</Card>
      <Card title="Complete ports">Full game logic, rendering, audio and multiplayer.</Card>
      <Card title="One base, many games">Shared infrastructure for every new port.</Card>
    </div>
  ),
};

export const Buttons: StoryObj = {
  render: () => (
    <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
      <Button href="#">☕ Buy me a coffee</Button>
      <Button onClick={() => {}}>Play now</Button>
    </div>
  ),
};

export const Branding: StoryObj = {
  render: () => (
    <div style={{ display: "grid", gap: 16 }}>
      <Kicker>
        A preservation initiative by <OrigamiBrand />
      </Kicker>
      <TopNav
        brand="wasm.ltd"
        logo="/wasm-logo.svg"
        links={[
          { label: "About", href: "#about" },
          { label: "Games", href: "#games" },
          { label: "Contact", href: "#contact" },
        ]}
      />
    </div>
  ),
};

export const Box3D: StoryObj = {
  name: "3D Game Box",
  render: () => (
    <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
      <GameBox
        href="https://generals.wasm.ltd"
        cover="/box-generals-cover.jpg"
        title="Command & Conquer: Generals Zero Hour"
        back={["WebAssembly + WebGPU", "Streaming assets", "LAN multiplayer"]}
      />
    </div>
  ),
};
