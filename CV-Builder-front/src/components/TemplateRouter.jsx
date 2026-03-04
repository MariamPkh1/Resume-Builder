import React from "react";
import { useParams } from "react-router-dom";
import ClassicBuilder from "./classic-template/ClassicBuilder";
import EuropassBuilder from "./europass-template/EuropassBuilder";

const TemplateRouter = () => {
  const { template } = useParams();

  // This matches the string you pass in the URL: /app/builder/:template/:resumeId
  if (template === "classic") {
    return <ClassicBuilder />;
  }

  if (template === "europass") {
    return <EuropassBuilder />;
  }

  return (
    <div className="h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800">Template Not Found</h2>
        <p className="text-gray-500">The requested design does not exist.</p>
      </div>
    </div>
  );
};

export default TemplateRouter;