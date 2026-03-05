import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Upload, CheckCircle, XCircle, AlertCircle, FileText, Loader2, DollarSign } from 'lucide-react';
import { validateToken, uploadDocument, getUploadedDocuments } from '../../api/documentUpload';
import toast from 'react-hot-toast';

const PayslipUpload = () => {
  const { token } = useParams();
  const [searchParams] = useSearchParams();
  const tenantId = searchParams.get('tenantId');

  const [loading, setLoading] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [candidateInfo, setCandidateInfo] = useState(null);
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const [rejectedDocs, setRejectedDocs] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({});
  const [uploading, setUploading] = useState({});

  // Payslip-specific document configuration
  const payslipDocConfig = {
    documentType: 'payslip',
    displayName: 'Payslip',
    description: 'Please upload your latest payslip for verification',
    isMandatory: true,
    allowedFormats: ['pdf', 'jpg', 'jpeg', 'png'],
    maxFileSizeMB: 5,
    uploadInstructions: 'Ensure your name, company name, and salary details are clearly visible'
  };

  useEffect(() => {
    if (token && tenantId) {
      validateUploadToken();
    } else {
      toast.error('Invalid upload link. Missing token or tenant ID.');
      setLoading(false);
    }
  }, [token, tenantId]);

  const validateUploadToken = async () => {
    try {
      const response = await validateToken(token, tenantId);
      if (response.success) {
        setTokenValid(true);
        setCandidateInfo(response.data.candidate);
        setUploadedDocs(response.data.uploadedDocuments || []);
        setRejectedDocs(response.data.rejectedDocuments || []);
      } else {
        toast.error(response.message || 'Invalid upload link');
      }
    } catch (error) {
      console.error('Token validation error:', error);
      toast.error(error.response?.data?.message || 'Failed to validate upload link');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (file, originalDocumentId = null) => {
    if (!file) return;

    // Validate file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > payslipDocConfig.maxFileSizeMB) {
      toast.error(`File size exceeds ${payslipDocConfig.maxFileSizeMB}MB limit`);
      return;
    }

    // Validate file format
    const fileExt = file.name.split('.').pop().toLowerCase();
    if (!payslipDocConfig.allowedFormats.includes(fileExt)) {
      toast.error(`Invalid file format. Allowed: ${payslipDocConfig.allowedFormats.join(', ')}`);
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const response = await uploadDocument(
        token,
        tenantId,
        payslipDocConfig.documentType,
        file,
        (progress) => {
          setUploadProgress(progress);
        },
        originalDocumentId
      );

      if (response.success) {
        toast.success('Payslip uploaded successfully');
        // Refresh uploaded documents
        const docsResponse = await getUploadedDocuments(token, tenantId);
        if (docsResponse.success) {
          setUploadedDocs(docsResponse.data);
        }
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.response?.data?.message || 'Failed to upload payslip');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const getPayslipDocs = () => {
    return uploadedDocs.filter(doc => doc.documentType === 'payslip');
  };

  const getRejectionReason = () => {
    const rejected = rejectedDocs.find(doc => doc.documentType === 'payslip');
    return rejected?.reason || null;
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'verified':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'unverified':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'resubmitted':
        return <AlertCircle className="w-5 h-5 text-blue-500" />;
      case 'pending':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'verified':
        return 'Verified';
      case 'unverified':
        return 'Rejected';
      case 'resubmitted':
        return 'Re-submitted';
      case 'pending':
        return 'Pending Review';
      default:
        return 'Not Uploaded';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-green-600 mx-auto mb-4" />
          <p className="text-gray-600">Validating payslip upload link...</p>
        </div>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Invalid Upload Link</h1>
          <p className="text-gray-600">
            This payslip upload link is invalid, expired, or has been revoked. Please contact HR for assistance.
          </p>
        </div>
      </div>
    );
  }

  const payslipDocs = getPayslipDocs();
  const latestDoc = payslipDocs[0] || null;
  const status = latestDoc?.verificationStatus || null;
  const rejectionReason = getRejectionReason();

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <div className="text-center mb-6">
            <div className="flex items-center justify-center mb-4">
              <DollarSign className="w-8 h-8 text-green-600 mr-2" />
              <h1 className="text-3xl font-bold text-gray-800">Payslip Upload Portal</h1>
            </div>
            <p className="text-gray-600">Upload your payslip for verification</p>
          </div>

          {/* Candidate Info */}
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-6 text-white">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-green-100 text-sm">Candidate ID</p>
                <p className="font-semibold text-lg">{candidateInfo?.candidateId}</p>
              </div>
              <div>
                <p className="text-green-100 text-sm">Name</p>
                <p className="font-semibold text-lg">{candidateInfo?.name}</p>
              </div>
              <div>
                <p className="text-green-100 text-sm">Email</p>
                <p className="font-semibold text-lg">{candidateInfo?.email}</p>
              </div>
              <div>
                <p className="text-green-100 text-sm">Position</p>
                <p className="font-semibold text-lg">{candidateInfo?.position}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Rejection Alert */}
        {rejectionReason && (
          <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-6 mb-6">
            <div className="flex items-start">
              <AlertCircle className="w-6 h-6 text-red-500 mt-0.5 mr-3" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-red-800 mb-2">
                  Payslip Rejected
                </h3>
                <p className="text-red-700">
                  <strong>Reason:</strong> {rejectionReason}
                </p>
                <p className="text-red-700 mt-2">
                  Please review the reason above and upload a corrected payslip.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-green-50 border-l-4 border-green-500 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-green-800 mb-2">Payslip Upload Guidelines</h3>
          <ul className="text-green-700 space-y-1 text-sm">
            <li>• Upload your latest payslip (most recent month)</li>
            <li>• Ensure your name, company name, and salary details are clearly visible</li>
            <li>• Accepted formats: PDF, JPG, JPEG, PNG</li>
            <li>• File size should not exceed 5MB</li>
            <li>• Make sure all sensitive information is legible</li>
          </ul>
        </div>

        {/* Payslip Upload Card */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                <h3 className="text-lg font-semibold text-gray-800">
                  {payslipDocConfig.displayName}
                  <span className="text-red-500 ml-1">*</span>
                </h3>
              </div>
              <p className="text-sm text-gray-600 mb-2">{payslipDocConfig.description}</p>
              <p className="text-xs text-gray-500">
                Formats: {payslipDocConfig.allowedFormats.join(', ').toUpperCase()} | 
                Max size: {payslipDocConfig.maxFileSizeMB}MB
              </p>
              <p className="text-xs text-green-600 mt-1">{payslipDocConfig.uploadInstructions}</p>
            </div>
            <div className="flex items-center gap-2">
              {status && getStatusIcon(status)}
              {status && (
                <span className={`text-sm font-medium ${
                  status === 'verified' ? 'text-green-600' :
                  status === 'unverified' ? 'text-red-600' :
                  status === 'resubmitted' ? 'text-blue-600' :
                  'text-yellow-600'
                }`}>
                  {getStatusText(status)}
                </span>
              )}
            </div>
          </div>

          {payslipDocs.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-3 mb-3">
              <p className="text-sm font-semibold text-gray-800 mb-1">
                Uploaded payslip:
              </p>
              <ul className="space-y-2 text-sm text-gray-700">
                {payslipDocs.map((doc, index) => (
                  <li
                    key={doc.documentId || `payslip-${index}`}
                    className="flex flex-col md:flex-row md:items-center md:justify-between gap-2"
                  >
                    <span className="truncate">{doc.fileName}</span>
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1">
                        {getStatusIcon(doc.verificationStatus)}
                        <span className="text-xs">
                          {getStatusText(doc.verificationStatus)}
                        </span>
                      </span>
                      <div>
                        <input
                          type="file"
                          id={`payslip-file-${doc.documentId || index}`}
                          className="hidden"
                          accept={payslipDocConfig.allowedFormats.map(f => `.${f}`).join(',')}
                          onChange={(e) =>
                            handleFileSelect(e.target.files[0], doc.documentId)
                          }
                        />
                        <label
                          htmlFor={`payslip-file-${doc.documentId || index}`}
                          className="inline-flex items-center justify-center px-3 py-1 text-xs font-medium rounded-md cursor-pointer bg-green-50 text-green-700 hover:bg-green-100 border border-green-200"
                        >
                          Re-upload
                        </label>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {uploading ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Uploading payslip...</span>
                <span className="text-green-600 font-medium">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              <div>
                <input
                  type="file"
                  id="payslip-file-main"
                  className="hidden"
                  accept={payslipDocConfig.allowedFormats.map(f => `.${f}`).join(',')}
                  onChange={(e) => handleFileSelect(e.target.files[0])}
                />
                <label
                  htmlFor="payslip-file-main"
                  className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-colors ${
                    status === 'verified'
                      ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  {status ? 'Re-upload Payslip' : 'Upload Payslip'}
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-white rounded-xl shadow-md p-6 text-center">
          <p className="text-gray-600 text-sm">
            If you have any questions about your payslip upload, please contact our HR team.
          </p>
          <p className="text-gray-500 text-xs mt-2">
            This is a secure upload portal. Your payslip is encrypted and stored safely.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PayslipUpload;
