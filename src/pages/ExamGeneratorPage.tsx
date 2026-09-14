import React from "react";
import { ExamPaperGenerator } from "../components/ExamPaperGenerator";

export const ExamGeneratorPage: React.FC = () => {
  return (
    <div className="py-2">
      <ExamPaperGenerator />
    </div>
  );
};

export default ExamGeneratorPage;
