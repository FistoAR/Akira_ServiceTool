import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { User, Mail, Calendar, Briefcase, Lock, ShieldCheck, ArrowLeft, Phone, Image, IndianRupee, Activity, Tag, Users, Eye, EyeOff } from "lucide-react";
import logo from "../../public/Akira_logo.webp";

const RegisterPage = () => {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [step, setStep] = useState(1);
  const [departments, setDepartments] = useState([]);
  
  const [formData, setFormData] = useState({
    name: "",
    userId: "",
    email: "",
    phoneNumber: "",
    dob: "",
    gender: "",
    role: "User",
    department: "",
    designation: "",
    ctc: "",
    dateOfJoining: "",
    workingStatus: "Active",
    password: "",
    confirmPassword: "",
    profilePicture: null,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    setMounted(true);

    const fetchDepartments = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/master/settings/departments`);
        if (response.data && response.data.length > 0) {
          setDepartments(response.data);
          setFormData((prev) => ({ ...prev, department: response.data[0] }));
        } else {
          const fallback = ["Support Engineers", "Service Engineers", "R&D"];
          setDepartments(fallback);
          setFormData((prev) => ({ ...prev, department: fallback[0] }));
        }
      } catch (err) {
        console.error("Error fetching departments:", err);
        const fallback = ["Support Engineers", "Service Engineers", "R&D"];
        setDepartments(fallback);
        setFormData((prev) => ({ ...prev, department: fallback[0] }));
      }
    };

    fetchDepartments();
  }, []);

  const handleInputChange = (e) => {
    const { name, value, files } = e.target;
    setError("");
    if (files) {
      const file = files[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFormData((prev) => ({ ...prev, [name]: reader.result }));
        };
        reader.readAsDataURL(file);
      }
    } else {
      if (name === "ctc" && Number(value) < 0) {
        return;
      }
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleNext = () => {
    const { name, userId, email, phoneNumber, dob, gender, password, confirmPassword } = formData;
    if (!name) return setError("Full Name is required.");
    if (!userId) return setError("User ID is required.");
    if (!email) return setError("Email Address is required.");
    if (!phoneNumber) return setError("Phone Number is required.");
    if (!dob) return setError("Date of Birth is required.");
    if (!gender) return setError("Gender is required.");
    if (!password) return setError("Password is required.");
    if (!confirmPassword) return setError("Confirm Password is required.");
    
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setStep(2);
  };

  const handleBack = () => {
    setStep(1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const { 
      name, userId, email, phoneNumber, dob, gender, role, 
      department, designation, ctc, dateOfJoining, workingStatus, 
      password, confirmPassword, profilePicture 
    } = formData;

    // Basic Validation
    if (!name) return setError("Full Name is required.");
    if (!userId) return setError("User ID is required.");
    if (!email) return setError("Email Address is required.");
    if (!phoneNumber) return setError("Phone Number is required.");
    if (!dob) return setError("Date of Birth is required.");
    if (!gender) return setError("Gender is required.");
    if (!designation) return setError("Designation is required.");
    if (!ctc) return setError("CTC is required.");
    if (Number(ctc) < 0) return setError("CTC cannot be negative.");
    if (!dateOfJoining) return setError("Date of Joining is required.");
    if (!password) return setError("Password is required.");
    if (!confirmPassword) return setError("Confirm Password is required.");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setSuccess("Registering employee...");
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/auth/register`, formData);
      
      setSuccess("Registration successful! Redirecting to login...");
      setTimeout(() => {
        navigate("/");
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed. Please try again.");
      setSuccess("");
    }
  };

  return (
    <div className="w-full min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 relative overflow-y-auto py-8 text-gray-700">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500">
        <div className="absolute inset-0 bg-gradient-to-tr from-cyan-400 via-indigo-500 to-purple-700 opacity-80"></div>
        <div className="absolute inset-0">
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className={`absolute w-[0.5vw] h-[0.5vw] bg-white bg-opacity-20 rounded-full transition-all duration-[6000ms] ${
                mounted ? "animate-pulse" : ""
              }`}
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${3 + Math.random() * 2}s`,
              }}
            ></div>
          ))}
        </div>
      </div>

      <div className="relative z-10 w-full max-w-[95%] sm:max-w-[85%] md:max-w-[75%] lg:max-w-[60%] xl:max-w-[45%]">
        <div
          className={`transition-all duration-1000 ${
            mounted
              ? "transform translate-y-0 opacity-100"
              : "transform translate-y-8 opacity-0"
          }`}
        >
          <div className="bg-white bg-opacity-95 backdrop-blur-lg rounded-2xl shadow-2xl p-[2vw] border border-white border-opacity-20">
            <div className="flex items-center justify-between mb-[1vw]">
               <button 
                onClick={() => navigate("/")}
                className="flex items-center gap-[0.3vw] text-[0.85vw] text-gray-500 hover:text-blue-600 transition-colors"
               >
                 <ArrowLeft size={"1vw"} /> Back to Login
               </button>
               <img src={logo} alt="App Logo" className="w-[6vw]" />
            </div>

            <div className="text-center mb-[1.5vw]">
              <h1 className="text-[1.8vw] md:text-[1.5vw] font-bold text-gray-800">Employee Registration</h1>
              <p className="text-[1vw] md:text-[0.8vw] text-gray-500 mt-1">
                Step {step} of 2: {step === 1 ? "Personal Details" : "Professional Details"}
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-[1vw] px-[1vw] py-[0.5vw] bg-red-50 border border-red-300 rounded-lg flex items-center gap-[0.5vw]">
                <div className="w-[0.5vw] h-[0.5vw] bg-red-500 rounded-full flex-shrink-0"></div>
                <p className="text-red-600 text-[0.85vw] font-medium">{error}</p>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="mb-[1vw] px-[1vw] py-[0.5vw] bg-green-50 border border-green-300 rounded-lg flex items-center gap-[0.5vw]">
                <div className="w-[0.5vw] h-[0.5vw] bg-green-500 rounded-full flex-shrink-0"></div>
                <p className="text-green-600 text-[0.85vw] font-medium">{success}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-x-[1.5vw] gap-y-[1.2vw]">
              {step === 1 ? (
                <>
                  <div className="relative group">
                    <label className="block text-[0.9vw] md:text-[0.8vw] font-medium text-gray-700 mb-[0.4vw]">
                      Full Name *
                    </label>
                    <div className="relative">
                      <Users size={"1.2vw"} className="absolute top-1/2 -translate-y-1/2 left-3 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className="w-full pl-[2.5vw] md:pl-[2.2vw] text-[1vw] md:text-[0.85vw] pr-[1vw] py-[0.6vw] md:py-[0.5vw] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                        placeholder="Enter full name"
                      />
                    </div>
                  </div>

                  <div className="relative group">
                    <label className="block text-[0.9vw] md:text-[0.8vw] font-medium text-gray-700 mb-[0.4vw]">
                      Employee ID / User ID *
                    </label>
                    <div className="relative">
                      <ShieldCheck size={"1.2vw"} className="absolute top-1/2 -translate-y-1/2 left-3 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                      <input
                        type="text"
                        name="userId"
                        value={formData.userId}
                        onChange={handleInputChange}
                        className="w-full pl-[2.5vw] md:pl-[2.2vw] text-[1vw] md:text-[0.85vw] pr-[1vw] py-[0.6vw] md:py-[0.5vw] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                        placeholder="e.g. Fisto9"
                      />
                    </div>
                  </div>

                  <div className="relative group">
                    <label className="block text-[0.9vw] md:text-[0.8vw] font-medium text-gray-700 mb-[0.4vw]">
                      Email Address *
                    </label>
                    <div className="relative">
                      <Mail size={"1.2vw"} className="absolute top-1/2 -translate-y-1/2 left-3 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="w-full pl-[2.5vw] md:pl-[2.2vw] text-[1vw] md:text-[0.85vw] pr-[1vw] py-[0.6vw] md:py-[0.5vw] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                        placeholder="example@akira.com"
                      />
                    </div>
                  </div>

                  <div className="relative group">
                    <label className="block text-[0.9vw] md:text-[0.8vw] font-medium text-gray-700 mb-[0.4vw]">
                      Phone Number *
                    </label>
                    <div className="relative">
                      <Phone size={"1.2vw"} className="absolute top-1/2 -translate-y-1/2 left-3 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                      <input
                        type="tel"
                        name="phoneNumber"
                        value={formData.phoneNumber}
                        onChange={handleInputChange}
                        className="w-full pl-[2.5vw] md:pl-[2.2vw] text-[1vw] md:text-[0.85vw] pr-[1vw] py-[0.6vw] md:py-[0.5vw] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                        placeholder="Enter phone number"
                      />
                    </div>
                  </div>

                  <div className="relative group">
                    <label className="block text-[0.9vw] md:text-[0.8vw] font-medium text-gray-700 mb-[0.4vw]">
                      Date of Birth *
                    </label>
                    <div className="relative">
                      <Calendar size={"1.2vw"} className="absolute top-1/2 -translate-y-1/2 left-3 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                      <input
                        type="date"
                        name="dob"
                        value={formData.dob}
                        onChange={handleInputChange}
                        className="w-full pl-[2.5vw] md:pl-[2.2vw] text-[1vw] md:text-[0.85vw] pr-[1vw] py-[0.6vw] md:py-[0.5vw] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                      />
                    </div>
                  </div>

                  <div className="relative group">
                    <label className="block text-[0.9vw] md:text-[0.8vw] font-medium text-gray-700 mb-[0.4vw]">
                      Gender *
                    </label>
                    <div className="relative">
                      <Users size={"1.2vw"} className="absolute top-1/2 -translate-y-1/2 left-3 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                      <select
                        name="gender"
                        value={formData.gender}
                        onChange={handleInputChange}
                        className="w-full pl-[2.5vw] md:pl-[2.2vw] text-[1vw] md:text-[0.85vw] pr-[1vw] py-[0.6vw] md:py-[0.5vw] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none appearance-none bg-white"
                      >
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="relative group">
                    <label className="block text-[0.9vw] md:text-[0.8vw] font-medium text-gray-700 mb-[0.4vw]">
                      Password *
                    </label>
                    <div className="relative">
                      <Lock size={"1.2vw"} className="absolute top-1/2 -translate-y-1/2 left-3 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        className="w-full pl-[2.5vw] md:pl-[2.2vw] text-[1vw] md:text-[0.85vw] pr-[3vw] py-[0.6vw] md:py-[0.5vw] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                        placeholder="Create password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute top-1/2 -translate-y-1/2 right-3 text-gray-400 hover:text-blue-500 transition-colors focus:outline-none"
                      >
                        {showPassword ? <EyeOff size={"1.2vw"} /> : <Eye size={"1.2vw"} />}
                      </button>
                    </div>
                  </div>

                  <div className="relative group">
                    <label className="block text-[0.9vw] md:text-[0.8vw] font-medium text-gray-700 mb-[0.4vw]">
                      Confirm Password *
                    </label>
                    <div className="relative">
                      <Lock size={"1.2vw"} className="absolute top-1/2 -translate-y-1/2 left-3 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        className="w-full pl-[2.5vw] md:pl-[2.2vw] text-[1vw] md:text-[0.85vw] pr-[3vw] py-[0.6vw] md:py-[0.5vw] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                        placeholder="Confirm password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute top-1/2 -translate-y-1/2 right-3 text-gray-400 hover:text-blue-500 transition-colors focus:outline-none"
                      >
                        {showConfirmPassword ? <EyeOff size={"1.2vw"} /> : <Eye size={"1.2vw"} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleNext}
                    className="col-span-1 md:col-span-2 mt-[1vw] text-[1.1vw] md:text-[1vw] w-full bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-[0.8vw] md:py-[0.7vw] rounded-lg font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.01] transition-all duration-300"
                  >
                    Next Step
                  </button>
                </>
              ) : (
                <>
                  <div className="relative group">
                    <label className="block text-[0.9vw] md:text-[0.8vw] font-medium text-gray-700 mb-[0.4vw]">
                      Role *
                    </label>
                    <div className="relative">
                      <ShieldCheck size={"1.2vw"} className="absolute top-1/2 -translate-y-1/2 left-3 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                      <select
                        name="role"
                        value={formData.role}
                        onChange={handleInputChange}
                        className="w-full pl-[2.5vw] md:pl-[2.2vw] text-[1vw] md:text-[0.85vw] pr-[1vw] py-[0.6vw] md:py-[0.5vw] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none appearance-none bg-white"
                      >
                        <option value="User">User</option>
                        <option value="Admin">Admin</option>
                      </select>
                    </div>
                  </div>

                  <div className="relative group">
                    <label className="block text-[0.9vw] md:text-[0.8vw] font-medium text-gray-700 mb-[0.4vw]">
                      Department *
                    </label>
                    <div className="relative">
                      <Briefcase size={"1.2vw"} className="absolute top-1/2 -translate-y-1/2 left-3 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                      <select
                        name="department"
                        value={formData.department}
                        onChange={handleInputChange}
                        className="w-full pl-[2.5vw] md:pl-[2.2vw] text-[1vw] md:text-[0.85vw] pr-[1vw] py-[0.6vw] md:py-[0.5vw] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none appearance-none bg-white"
                      >
                        <option value="">Select Department</option>
                        {departments.map(dept => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="relative group">
                    <label className="block text-[0.9vw] md:text-[0.8vw] font-medium text-gray-700 mb-[0.4vw]">
                      Designation *
                    </label>
                    <div className="relative">
                      <Tag size={"1.2vw"} className="absolute top-1/2 -translate-y-1/2 left-3 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                      <input
                        type="text"
                        name="designation"
                        value={formData.designation}
                        onChange={handleInputChange}
                        className="w-full pl-[2.5vw] md:pl-[2.2vw] text-[1vw] md:text-[0.85vw] pr-[1vw] py-[0.6vw] md:py-[0.5vw] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                        placeholder="e.g. Senior Engineer"
                      />
                    </div>
                  </div>

                  <div className="relative group">
                    <label className="block text-[0.9vw] md:text-[0.8vw] font-medium text-gray-700 mb-[0.4vw]">
                      CTC (Monthly) *
                    </label>
                    <div className="relative">
                      <IndianRupee size={"1.2vw"} className="absolute top-1/2 -translate-y-1/2 left-3 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                      <input
                        type="number"
                        name="ctc"
                        min="0"
                        value={formData.ctc}
                        onChange={handleInputChange}
                        className="w-full pl-[2.5vw] md:pl-[2.2vw] text-[1vw] md:text-[0.85vw] pr-[1vw] py-[0.6vw] md:py-[0.5vw] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                        placeholder="Enter monthly CTC"
                      />
                    </div>
                  </div>

                  <div className="relative group">
                    <label className="block text-[0.9vw] md:text-[0.8vw] font-medium text-gray-700 mb-[0.4vw]">
                      Date of Joining *
                    </label>
                    <div className="relative">
                      <Calendar size={"1.2vw"} className="absolute top-1/2 -translate-y-1/2 left-3 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                      <input
                        type="date"
                        name="dateOfJoining"
                        value={formData.dateOfJoining}
                        onChange={handleInputChange}
                        className="w-full pl-[2.5vw] md:pl-[2.2vw] text-[1vw] md:text-[0.85vw] pr-[1vw] py-[0.6vw] md:py-[0.5vw] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                      />
                    </div>
                  </div>

                  <div className="relative group">
                    <label className="block text-[0.9vw] md:text-[0.8vw] font-medium text-gray-700 mb-[0.4vw]">
                      Working Status *
                    </label>
                    <div className="relative">
                      <Activity size={"1.2vw"} className="absolute top-1/2 -translate-y-1/2 left-3 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                      <select
                        name="workingStatus"
                        value={formData.workingStatus}
                        onChange={handleInputChange}
                        className="w-full pl-[2.5vw] md:pl-[2.2vw] text-[1vw] md:text-[0.85vw] pr-[1vw] py-[0.6vw] md:py-[0.5vw] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none appearance-none bg-white"
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                        <option value="On Leave">On Leave</option>
                      </select>
                    </div>
                  </div>

                  <div className="relative group md:col-span-2">
                    <label className="block text-[0.9vw] md:text-[0.8vw] font-medium text-gray-700 mb-[0.4vw]">
                      Profile Picture
                    </label>
                    <div className="relative">
                      <Image size={"1.2vw"} className="absolute top-1/2 -translate-y-1/2 left-3 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                      <input
                        type="file"
                        accept="image/*"
                        name="profilePicture"
                        onChange={handleInputChange}
                        className="w-full pl-[2.5vw] md:pl-[2.2vw] text-[0.9vw] md:text-[0.75vw] pr-[1vw] py-[0.6vw] md:py-[0.5vw] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-[0.8vw] file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                    </div>
                    {formData.profilePicture && (
                      <div className="mt-3 flex items-center gap-3">
                        <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-blue-500">
                          <img src={formData.profilePicture} alt="Preview" className="w-full h-full object-cover" />
                        </div>
                        <span className="text-xs text-gray-500">Image Preview</span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4 col-span-1 md:col-span-2 mt-4">
                    <button
                      type="button"
                      onClick={handleBack}
                      className="text-[1.1vw] md:text-[1vw] w-full bg-gray-200 text-gray-700 py-[0.8vw] md:py-[0.7vw] rounded-lg font-semibold shadow hover:bg-gray-300 transition-all duration-300"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      className="text-[1.1vw] md:text-[1vw] w-full bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-[0.8vw] md:py-[0.7vw] rounded-lg font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.01] transition-all duration-300"
                    >
                      Complete Registration
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
