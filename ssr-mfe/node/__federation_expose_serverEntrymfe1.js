"use strict";
exports.ids = ["__federation_expose_serverEntry"];
exports.modules = {
"./src/routes.tsx"(__unused_rspack_module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  routes: () => (routes)
});
/* import */ var react_jsx_dev_runtime__rspack_import_0 = __webpack_require__("./node_modules/react/jsx-dev-runtime.js");
/* import */ var react_compiler_runtime__rspack_import_1 = __webpack_require__("./node_modules/react/compiler-runtime.js");
/* import */ var react_router__rspack_import_2 = __webpack_require__("webpack/sharing/consume/default/react-router/react-router");



// Stands in for a fetch() to a real API/BFF — the only backend-access
// pattern an MFE loader is allowed (architecture doc, rule 2).
async function fetchGreeting() {
    return {
        message: "Hello from MFE1 — this content was rendered on the server.",
        fetchedAt: new Date().toISOString()
    };
}
function Layout() {
    const $ = (0,react_compiler_runtime__rspack_import_1.c)(3);
    let t0;
    let t1;
    if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
        t0 = {
            border: "2px dashed #999",
            padding: 12,
            borderRadius: 8
        };
        t1 = /*#__PURE__*/ (0,react_jsx_dev_runtime__rspack_import_0.jsxDEV)("strong", {
            children: "MFE1"
        }, void 0, false, void 0, this);
        $[0] = t0;
        $[1] = t1;
    } else {
        t0 = $[0];
        t1 = $[1];
    }
    let t2;
    if ($[2] === Symbol.for("react.memo_cache_sentinel")) {
        t2 = /*#__PURE__*/ (0,react_jsx_dev_runtime__rspack_import_0.jsxDEV)("div", {
            style: t0,
            children: [
                t1,
                " (own router, basename /mfe1)",
                /*#__PURE__*/ (0,react_jsx_dev_runtime__rspack_import_0.jsxDEV)("nav", {
                    style: {
                        display: "flex",
                        gap: 8,
                        margin: "8px 0"
                    },
                    children: [
                        /*#__PURE__*/ (0,react_jsx_dev_runtime__rspack_import_0.jsxDEV)(react_router__rspack_import_2.Link, {
                            to: "/",
                            children: "Home"
                        }, void 0, false, void 0, this),
                        /*#__PURE__*/ (0,react_jsx_dev_runtime__rspack_import_0.jsxDEV)(react_router__rspack_import_2.Link, {
                            to: "/about",
                            children: "About"
                        }, void 0, false, void 0, this)
                    ]
                }, void 0, true, void 0, this),
                /*#__PURE__*/ (0,react_jsx_dev_runtime__rspack_import_0.jsxDEV)(react_router__rspack_import_2.Outlet, {}, void 0, false, void 0, this)
            ]
        }, void 0, true, void 0, this);
        $[2] = t2;
    } else {
        t2 = $[2];
    }
    return t2;
}
function Home() {
    const $ = (0,react_compiler_runtime__rspack_import_1.c)(7);
    const loaderData = (0,react_router__rspack_import_2.useLoaderData)();
    let t0;
    if ($[0] !== loaderData.message) {
        t0 = /*#__PURE__*/ (0,react_jsx_dev_runtime__rspack_import_0.jsxDEV)("p", {
            children: loaderData.message
        }, void 0, false, void 0, this);
        $[0] = loaderData.message;
        $[1] = t0;
    } else {
        t0 = $[1];
    }
    let t1;
    if ($[2] !== loaderData.fetchedAt) {
        t1 = /*#__PURE__*/ (0,react_jsx_dev_runtime__rspack_import_0.jsxDEV)("small", {
            children: [
                "fetched at ",
                loaderData.fetchedAt
            ]
        }, void 0, true, void 0, this);
        $[2] = loaderData.fetchedAt;
        $[3] = t1;
    } else {
        t1 = $[3];
    }
    let t2;
    if ($[4] !== t0 || $[5] !== t1) {
        t2 = /*#__PURE__*/ (0,react_jsx_dev_runtime__rspack_import_0.jsxDEV)("div", {
            children: [
                t0,
                t1
            ]
        }, void 0, true, void 0, this);
        $[4] = t0;
        $[5] = t1;
        $[6] = t2;
    } else {
        t2 = $[6];
    }
    return t2;
}
const routes = [
    {
        path: "/",
        Component: Layout,
        children: [
            {
                id: "home",
                index: true,
                loader: fetchGreeting,
                Component: Home
            },
            {
                path: "about",
                Component: ()=>/*#__PURE__*/ (0,react_jsx_dev_runtime__rspack_import_0.jsxDEV)("p", {
                        children: "MFE1 about route — client-side navigation."
                    }, void 0, false, {
                        fileName: "/Users/redabezzour/Desktop/tanstack-start/start-basic-rsbuild/ssr-mfe/src/routes.tsx",
                        lineNumber: 54,
                        columnNumber: 26
                    }, undefined)
            }
        ]
    }
];


},
"./src/serverEntry.tsx"(__unused_rspack_module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  serverEntry: () => (serverEntry)
});
/* import */ var react_jsx_dev_runtime__rspack_import_0 = __webpack_require__("./node_modules/react/jsx-dev-runtime.js");
/* import */ var react_dom_server__rspack_import_1 = __webpack_require__("./node_modules/react-dom/server.node.js");
/* import */ var react_router__rspack_import_2 = __webpack_require__("webpack/sharing/consume/default/react-router/react-router");
/* import */ var _routes__rspack_import_3 = __webpack_require__("./src/routes.tsx");




/**
 * Federated server entry — called in-process by the shell's Start server.
 * Plain React Router in library mode: no MFE-owned server, no server routes.
 */ async function serverEntry({ url, headers = {}, basePath }) {
    const handler = (0,react_router__rspack_import_2.createStaticHandler)(_routes__rspack_import_3.routes, {
        basename: basePath
    });
    // Origin is irrelevant — only the path is used for matching. Headers are
    // forwarded so loaders can pass auth/cookies on to the API/BFF.
    const request = new Request(new URL(url, 'http://mfe1.internal').href, {
        headers
    });
    const context = await handler.query(request);
    if (context instanceof Response) {
        throw new Error(`MFE1 returned a ${context.status} instead of rendering`);
    }
    const router = (0,react_router__rspack_import_2.createStaticRouter)(handler.dataRoutes, context);
    // hydrate={false} suppresses React Router's own
    // `window.__staticRouterHydrationData` script — the shell carries loader
    // data back to `clientEntry` as plain data instead, so nothing depends on
    // a document-level global.
    const html = (0,react_dom_server__rspack_import_1.renderToString)(/*#__PURE__*/ (0,react_jsx_dev_runtime__rspack_import_0.jsxDEV)(react_router__rspack_import_2.StaticRouterProvider, {
        router: router,
        context: context,
        hydrate: false
    }, void 0, false, {
        fileName: "/Users/redabezzour/Desktop/tanstack-start/start-basic-rsbuild/ssr-mfe/src/serverEntry.tsx",
        lineNumber: 52,
        columnNumber: 5
    }, this));
    return {
        html,
        data: context.loaderData,
        head: {
            title: 'MFE1'
        }
    };
}


},

};
;
//# sourceMappingURL=__federation_expose_serverEntrymfe1.js.map