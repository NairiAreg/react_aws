import React from "react";
import {
  BrowserRouter,
  Routes as RouterRoutes,
  Route as ReactRoute,
} from "react-router-dom";
import routes from "./configs";
import NotFound from "./NotFound.jsx";
import Navbar from "components/Navbar";

export const RouterProvider = BrowserRouter;

const Routes = () => {
  return (
    <>
      <Navbar />

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
    </>
  );
};

export default Routes;
