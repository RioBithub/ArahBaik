import React, { lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider, ToastProvider } from "./lib";
import { Layout, Protect, Loading } from "./components";
import { Home, Guide, About, Privacy, NotFound } from "./pages";
import { Directory, Detail, Transparency, Favorites } from "./public-pages";
const Account = lazy(() =>
  import("./workspace").then((m) => ({ default: m.Account })),
);
const Dashboard = lazy(() =>
  import("./workspace").then((m) => ({ default: m.Dashboard })),
);
const SubmissionEditor = lazy(() =>
  import("./workspace").then((m) => ({ default: m.SubmissionEditor })),
);
const Admin = lazy(() =>
  import("./workspace").then((m) => ({ default: m.Admin })),
);
import "./styles.css";
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Layout>
            <Suspense fallback={<Loading />}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/jelajahi" element={<Directory />} />
                <Route path="/tempat/:id" element={<Detail />} />
                <Route path="/panduan" element={<Guide />} />
                <Route path="/tentang" element={<About />} />
                <Route path="/transparansi" element={<Transparency />} />
                <Route path="/privasi" element={<Privacy />} />
                <Route path="/akun" element={<Account />} />
                <Route
                  path="/dashboard"
                  element={
                    <Protect>
                      <Dashboard />
                    </Protect>
                  }
                />
                <Route
                  path="/dashboard/baru"
                  element={
                    <Protect>
                      <SubmissionEditor />
                    </Protect>
                  }
                />
                <Route
                  path="/dashboard/:id"
                  element={
                    <Protect>
                      <SubmissionEditor />
                    </Protect>
                  }
                />
                <Route
                  path="/tersimpan"
                  element={
                    <Protect>
                      <Favorites />
                    </Protect>
                  }
                />
                <Route
                  path="/admin"
                  element={
                    <Protect adminOnly>
                      <Admin />
                    </Protect>
                  }
                />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </Layout>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
