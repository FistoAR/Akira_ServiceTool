const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, 'src/pages/ServiceCallReports.jsx');
let content = fs.readFileSync(target, 'utf8');

// 1. Update ActionLogsView signature
content = content.replace(
  'const ActionLogsView = ({ calls, employees, isEmployeeWise, targetEmployee }) => {',
  'const ActionLogsView = ({ calls, employees, isEmployeeWise, targetEmployee, tabsElement, dateFilterElement }) => {'
);

// 2. Update ActionLogsView header
const oldActionLogsHeader = `
      <div className="flex flex-col border-b border-slate-200 bg-slate-50 rounded-t-[0.8vw]">
        <div className="flex items-center justify-between p-[1vw]">
          <div className="flex items-center gap-[0.5vw]">
            {/* <h2 className="text-[1.2vw] font-bold text-slate-800 tracking-tight leading-none">
              {isEmployeeWise ? \`\${targetEmployee?.name} - Action Logs\` : "Overall Calls Logs"}
            </h2> */}
            <span className="px-[0.6vw] py-[0.1vw] bg-indigo-100 text-indigo-700 text-[0.8vw] font-bold rounded-full">{groupedData.length} Calls</span>
          </div>
        
          <div className="flex items-center gap-[0.8vw]">
            <div className="relative">
`.trim();

const newActionLogsHeader = `
      <div className="flex flex-col border-b border-slate-200 bg-slate-50 rounded-t-[0.8vw]">
        <div className="flex items-center justify-between p-[1vw]">
          <div className="flex items-center gap-[0.5vw]">
            {tabsElement}
            <span className="px-[0.6vw] py-[0.1vw] bg-indigo-100 text-indigo-700 text-[0.8vw] font-bold rounded-full">{groupedData.length} Calls</span>
          </div>
        
          <div className="flex items-center gap-[0.8vw]">
            {dateFilterElement}
            <div className="relative">
`.trim();

if (!content.includes(oldActionLogsHeader)) {
  console.log("Could not find oldActionLogsHeader!");
} else {
  content = content.replace(oldActionLogsHeader, newActionLogsHeader);
}

// 3. Inject elements in ServiceCallReports
const injectionPoint = 'if (loading) {';

const injectedElements = `
  const tabsElement = (
    <div className="flex items-center bg-white p-[0.2vw] rounded-[0.4vw] border border-slate-300 shadow-sm mr-[0.5vw]">
      <button 
        onClick={() => { setActiveTab("overall"); setSelectedEmp(null); }}
        className={\`px-[1vw] py-[0.4vw] text-[0.85vw] font-bold rounded-[0.3vw] transition-colors \${activeTab === 'overall' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}\`}
      >
        Overall Report
      </button>
      <button 
        onClick={() => setActiveTab("employee")}
        className={\`px-[1vw] py-[0.4vw] text-[0.85vw] font-bold rounded-[0.3vw] transition-colors \${activeTab === 'employee' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}\`}
      >
        Employee wise
      </button>
    </div>
  );

  const dateFilterElement = (
    <div className="flex items-center gap-[0.4vw] bg-white p-[0.1vw] rounded-[0.5vw] border border-slate-300 shadow-sm mr-[0.5vw]">
      <div className="flex items-center gap-[0.3vw] px-[0.6vw] border-r border-slate-300">
        <span className="text-[0.7vw] font-bold text-slate-500 uppercase tracking-widest">From:</span>
        <Calendar className="w-[0.8vw] h-[0.8vw] text-slate-400" />
        <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
          className="text-[0.75vw] font-semibold outline-none bg-transparent h-[1.8vw] w-[6.5vw] cursor-pointer text-slate-700" />
      </div>
      <div className="flex items-center gap-[0.3vw] px-[0.6vw]">
        <span className="text-[0.7vw] font-bold text-slate-500 uppercase tracking-widest">To:</span>
        <Calendar className="w-[0.8vw] h-[0.8vw] text-slate-400" />
        <input type="date" min={fromDate} value={toDate} onChange={(e) => setToDate(e.target.value)}
          className="text-[0.75vw] font-semibold outline-none bg-transparent h-[1.8vw] w-[6.5vw] cursor-pointer text-slate-700" />
      </div>
    </div>
  );

  if (loading) {
`.trim();

content = content.replace(injectionPoint, injectedElements);


// 4. Update Drill-down view invocation
const drillDownViewOld = `
        <div className="flex-1 overflow-hidden">
          <ActionLogsView 
             calls={filteredCalls} 
             employees={employees} 
             isEmployeeWise={true}
             targetEmployee={selectedEmp}
          />
        </div>
`.trim();

const drillDownViewNew = `
        <div className="flex-1 overflow-hidden">
          <ActionLogsView 
             calls={filteredCalls} 
             employees={employees} 
             isEmployeeWise={true}
             targetEmployee={selectedEmp}
             tabsElement={null}
             dateFilterElement={dateFilterElement}
          />
        </div>
`.trim();

content = content.replace(drillDownViewOld, drillDownViewNew);

// 5. Replace the entire return of ServiceCallReports
const mainReturnOld = `
  return (
    <div className="flex flex-col h-[90vh] overflow-hidden bg-white gap-[0.8vw]">
      {/* Top Header & Filters Area */}
      <div className="flex flex-col border-b border-slate-200">
        <div className="flex items-center justify-between px-[1vw] py-[0.8vw] bg-slate-50">
          <div className="flex items-center gap-[1vw]">
            {/* <h2 className="text-[1.3vw] font-black text-slate-800 tracking-tight flex items-center gap-[0.5vw]">
              <FileText className="w-[1.4vw] h-[1.4vw] text-indigo-600" />
              Service Call Reports
            </h2> */}
            
            {/* Tabs */}
            <div className="flex items-center bg-white p-[0.2vw] rounded-lg border border-slate-300 ml-[1vw] shadow-sm">
              <button 
                onClick={() => setActiveTab("overall")}
                className={\`px-[1vw] py-[0.4vw] text-[0.85vw] font-bold rounded-[0.4vw] transition-colors \${activeTab === 'overall' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}\`}
              >
                Overall Report
              </button>
              <button 
                onClick={() => setActiveTab("employee")}
                className={\`px-[1vw] py-[0.4vw] text-[0.85vw] font-bold rounded-[0.4vw] transition-colors \${activeTab === 'employee' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}\`}
              >
                Employee wise
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-[0.8vw]">
            <div className="flex items-center gap-[0.4vw] bg-white p-[0.1vw] rounded-[0.5vw] border border-slate-300 shadow-sm">
              <div className="flex items-center gap-[0.3vw] px-[0.6vw] border-r border-slate-300">
                <span className="text-[0.7vw] font-bold text-slate-500 uppercase tracking-widest">From:</span>
                <Calendar className="w-[0.8vw] h-[0.8vw] text-slate-400" />
                <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
                  className="text-[0.75vw] font-semibold outline-none bg-transparent h-[1.8vw] w-[6.5vw] cursor-pointer text-slate-700" />
              </div>
              <div className="flex items-center gap-[0.3vw] px-[0.6vw]">
                <span className="text-[0.7vw] font-bold text-slate-500 uppercase tracking-widest">To:</span>
                <Calendar className="w-[0.8vw] h-[0.8vw] text-slate-400" />
                <input type="date" min={fromDate} value={toDate} onChange={(e) => setToDate(e.target.value)}
                  className="text-[0.75vw] font-semibold outline-none bg-transparent h-[1.8vw] w-[6.5vw] cursor-pointer text-slate-700" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden px-[1vw] pb-[1vw]">
        {activeTab === "overall" ? (
          <ActionLogsView 
             calls={filteredCalls} 
             employees={employees} 
             isEmployeeWise={false}
          />
        ) : (
          <div className="flex flex-col h-full overflow-hidden bg-white rounded-[0.8vw] shadow-sm border border-slate-300 relative animate-in fade-in zoom-in-95 duration-500">
            <div className="flex items-center justify-between p-[1vw] border-b border-slate-200 bg-slate-50 rounded-t-[0.8vw]">
               <h3 className="text-[1.1vw] font-bold text-slate-800 tracking-tight flex items-center gap-[0.5vw]">
                 <Users className="w-[1.2vw] h-[1.2vw] text-indigo-600" />
                 Employee Allocations
               </h3>
               
               <div className="relative">
                 <Search className="absolute left-[0.6vw] top-1/2 -translate-y-1/2 w-[1vw] h-[1vw] text-slate-400" />
                 <input value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                   placeholder="Search employee..."
                   className="pl-[2.2vw] pr-[0.8vw] py-[0.5vw] border border-slate-300 rounded-[0.4vw] focus:outline-none focus:border-indigo-500 text-[0.8vw] w-[15vw] text-slate-700 font-bold bg-white placeholder-slate-400"
                 />
               </div>
            </div>
`.trim();

const mainReturnNew = `
  return (
    <div className="flex flex-col h-[90vh] overflow-hidden bg-slate-50 gap-[0.8vw] p-[1vw]">
      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "overall" ? (
          <ActionLogsView 
             calls={filteredCalls} 
             employees={employees} 
             isEmployeeWise={false}
             tabsElement={tabsElement}
             dateFilterElement={dateFilterElement}
          />
        ) : (
          <div className="flex flex-col h-full overflow-hidden bg-white rounded-[0.8vw] shadow-sm border border-slate-300 relative animate-in fade-in zoom-in-95 duration-500">
            <div className="flex items-center justify-between p-[1vw] border-b border-slate-200 bg-slate-50 rounded-t-[0.8vw]">
               <div className="flex items-center gap-[0.5vw]">
                 {tabsElement}
                 <span className="px-[0.6vw] py-[0.1vw] bg-indigo-100 text-indigo-700 text-[0.8vw] font-bold rounded-full">{displayRows.length} Employees</span>
               </div>
               
               <div className="flex items-center gap-[0.8vw]">
                 {dateFilterElement}
                 <div className="relative">
                   <Search className="absolute left-[0.6vw] top-1/2 -translate-y-1/2 w-[1vw] h-[1vw] text-slate-400" />
                   <input value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                     placeholder="Search employee..."
                     className="pl-[2.2vw] pr-[0.8vw] py-[0.5vw] border border-slate-300 rounded-[0.4vw] focus:outline-none focus:border-indigo-500 text-[0.8vw] w-[15vw] text-slate-700 font-bold bg-white placeholder-slate-400"
                   />
                 </div>
               </div>
            </div>
`.trim();

if (!content.includes(mainReturnOld)) {
  console.log("Could not find mainReturnOld!");
} else {
  content = content.replace(mainReturnOld, mainReturnNew);
}

fs.writeFileSync(target, content);
console.log('Successfully updated ServiceCallReports.jsx layouts.');
