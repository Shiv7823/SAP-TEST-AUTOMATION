import React, { useState } from 'react';
import Navbar from './components/Navbar';
import UploadPage from './pages/UploadPage';
import KBPage from './pages/KBPage';
import GeneratePage from './pages/GeneratePage';
import ReviewPage from './pages/ReviewPage';
import DownloadPage from './pages/DownloadPage';

export default function App() {
  const [currentStep, setCurrentStep] = useState('upload'); // 'upload' | 'kb' | 'generate' | 'review' | 'download'
  const [previousStep, setPreviousStep] = useState('upload');
  
  // Pipeline state
  const [requirementDoc, setRequirementDoc] = useState(null);
  const [testCases, setTestCases] = useState([]);
  const [relevantKbsUsed, setRelevantKbsUsed] = useState([]);
  const [approvedData, setApprovedData] = useState(null);

  // Navigation helpers
  const navigateTo = (step) => {
    if (step !== 'kb') {
      setPreviousStep(step);
    }
    setCurrentStep(step);
  };

  const handleOpenKBs = () => {
    setPreviousStep(currentStep);
    setCurrentStep('kb');
  };

  const handleBackFromKBs = () => {
    setCurrentStep(previousStep || 'upload');
  };

  const handleTestCasesGenerated = (cases, kbsUsed) => {
    setTestCases(cases);
    setRelevantKbsUsed(kbsUsed);
    navigateTo('review');
  };

  const handleApprovalComplete = (exportJson) => {
    setApprovedData(exportJson);
    navigateTo('download');
  };

  const handleStartNew = () => {
    setRequirementDoc(null);
    setTestCases([]);
    setRelevantKbsUsed([]);
    setApprovedData(null);
    navigateTo('upload');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar 
        currentStep={currentStep}
        setCurrentStep={navigateTo}
        requirementDoc={requirementDoc}
        testCases={testCases}
        approvedData={approvedData}
      />

      <main style={{ flex: 1, paddingBottom: '3rem' }}>
        {currentStep === 'upload' && (
          <UploadPage 
            requirementDoc={requirementDoc}
            setRequirementDoc={setRequirementDoc}
            onProceed={() => navigateTo('generate')}
            onGoToKBs={handleOpenKBs}
          />
        )}

        {currentStep === 'kb' && (
          <KBPage 
            onBackToPipeline={handleBackFromKBs}
            requirementDoc={requirementDoc}
          />
        )}

        {currentStep === 'generate' && (
          <GeneratePage 
            requirementDoc={requirementDoc}
            onTestCasesGenerated={handleTestCasesGenerated}
            onAbortToKBs={handleOpenKBs}
            onBackToUpload={() => navigateTo('upload')}
          />
        )}

        {currentStep === 'review' && (
          <ReviewPage 
            testCases={testCases}
            setTestCases={setTestCases}
            relevantKbsUsed={relevantKbsUsed}
            onApprovalComplete={handleApprovalComplete}
            onGoToUpload={() => navigateTo('upload')}
            onGoToGenerate={() => navigateTo('generate')}
          />
        )}

        {currentStep === 'download' && (
          <DownloadPage 
            approvedData={approvedData}
            onStartNew={handleStartNew}
            onGoToReview={() => navigateTo('review')}
          />
        )}
      </main>
    </div>
  );
}
