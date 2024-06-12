import React from "react";
import {
  BrowserRouter,
  Routes as RouterRoutes,
  Route as ReactRoute,
} from "react-router-dom";
import routes from "./configs";
import NotFound from "./NotFound.jsx";

export const RouterProvider = BrowserRouter;

const Routes = () => {
  return (
    <RouterRoutes>
      {routes.map(({ path, exact, Component, secured, Layout }) => (
        <ReactRoute
          key="path"
          path={path}
          element={
            <Layout>
              <Component />
            </Layout>
          }
        />
      ))}
      <ReactRoute path="*" element={<NotFound />} />
    </RouterRoutes>
  );
};

export default Routes;
