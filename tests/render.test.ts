import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { Home, Guide, About, Privacy, NotFound } from "../src/pages";
import {
  Directory,
  Detail,
  Transparency,
  Favorites,
} from "../src/public-pages";
import { Account, Dashboard, SubmissionEditor, Admin } from "../src/workspace";
import { Layout } from "../src/components";
for (const [name, Component, route] of [
  ["home", Home, "/"],
  ["guide", Guide, "/panduan"],
  ["about", About, "/tentang"],
  ["privacy", Privacy, "/privasi"],
  ["directory", Directory, "/jelajahi?category=Masjid"],
  ["detail loading", Detail, "/tempat/test"],
  ["ledger", Transparency, "/transparansi"],
  ["saved loading", Favorites, "/tersimpan"],
  ["account", Account, "/akun"],
  ["dashboard loading", Dashboard, "/dashboard"],
  ["submission editor", SubmissionEditor, "/dashboard/baru"],
  ["admin", Admin, "/admin"],
  ["404", NotFound, "/missing"],
] as [string, ComponentType, string][]) {
  test(`render ${name} within app layout`, () => {
    const html = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        { initialEntries: [route] },
        createElement(Layout, { children: createElement(Component) }),
      ),
    );
    assert.match(html, /id="main"/);
    assert.match(html, /Logo Axura Team/);
    assert.match(html, /href="\/privasi"/);
    assert.ok(!html.includes("undefined"));
    if (name === "submission editor") {
      assert.match(html, /Nama penerima sesuai QRIS/);
      assert.match(html, /Penanggung jawab/);
      assert.match(html, /type="checkbox"/);
    }
    if (name === "home") {
      assert.match(html, /Kebaikanmu/);
      assert.match(html, /Langsung ke penerima/);
    }
  });
}
