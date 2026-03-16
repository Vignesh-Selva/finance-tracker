import{getApps as nt,initializeApp as $t}from"https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";import{getAuth as xt,GoogleAuthProvider as Tt,signInWithPopup as Dt,signOut as Lt,onAuthStateChanged as kt}from"https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";import{getFirestore as Mt,doc as It,deleteDoc as Pt,setDoc as Bt,serverTimestamp as qt,getDocs as Ot,collection as Rt}from"https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))n(r);new MutationObserver(r=>{for(const a of r)if(a.type==="childList")for(const o of a.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&n(o)}).observe(document,{childList:!0,subtree:!0});function e(r){const a={};return r.integrity&&(a.integrity=r.integrity),r.referrerPolicy&&(a.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?a.credentials="include":r.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function n(r){if(r.ep)return;r.ep=!0;const a=e(r);fetch(r.href,a)}})();const Ut={formatCurrency(s){try{const t=parseFloat(s);return isNaN(t)?"₹0.00":"₹"+t.toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2})}catch(t){return console.error("Currency formatting error:",t),"₹0.00"}},formatDate(s){if(!s||s==="NA")return"NA";try{const t=new Date(s);return isNaN(t.getTime())?"Invalid Date":t.toLocaleDateString("en-IN",{year:"numeric",month:"short",day:"numeric"})}catch(t){return console.error("Date formatting error:",t),"Invalid Date"}},formatLargeNumber(s){try{const t=parseFloat(s);return isNaN(t)?"0":t>=1e7?(t/1e7).toFixed(2)+" Cr":t>=1e5?(t/1e5).toFixed(2)+" L":t>=1e3?(t/1e3).toFixed(2)+" K":t.toFixed(2)}catch(t){return console.error("Large number formatting error:",t),"0"}}},Ht={calculatePL(s,t){try{const e=parseFloat(s)||0,r=(parseFloat(t)||0)-e,a=e>0?(r/e*100).toFixed(2):0;return{pl:isNaN(r)||!isFinite(r)?0:r,plPercent:isNaN(a)||!isFinite(a)?0:a}}catch(e){return console.error("P/L calculation error:",e),{pl:0,plPercent:0}}}},zt={sanitizeString(s){if(!s)return"";try{const t=document.createElement("div");return t.textContent=s,t.innerHTML}catch(t){return console.error("String sanitization error:",t),String(s).replace(/[<>]/g,"")}},sanitizeNumber(s,t=!1){try{const e=parseFloat(s);return isNaN(e)||!isFinite(e)||!t&&e<0?0:e}catch(e){return console.error("Number sanitization error:",e),0}},deepClone(s){try{return JSON.parse(JSON.stringify(s))}catch(t){return console.error("Deep clone error:",t),s}}},L={savings:[],fixedDeposits:[],mutualFunds:[],stocks:[],crypto:[],liabilities:[],transactions:[],budgets:[],settings:{id:1,currency:"INR",goal:15e6,epf:0,ppf:0,theme:"light",lastSync:new Date().toISOString()}},Gt={async getSettings(s){try{return(await s.getAll("settings"))[0]||L.settings}catch(t){return console.error("Get settings error:",t),L.settings}},exportData(s,t="finance-backup.json"){try{const e=this.sanitizeExportData(s),n=JSON.stringify(e,null,2),r=new Blob([n],{type:"application/json"}),a=URL.createObjectURL(r),o=document.createElement("a");o.href=a,o.download=t,o.click(),URL.revokeObjectURL(a)}catch(e){throw console.error("Export data error:",e),new Error("Failed to export data")}},sanitizeExportData(s){try{const t={};for(const[e,n]of Object.entries(s))Array.isArray(n)?t[e]=n.map(r=>({...r})):t[e]=n;return t}catch(t){return console.error("Data sanitization error:",t),s}},async importData(s,t){return new Promise((e,n)=>{if(!s){n(new Error("No file provided"));return}if(!s.name.endsWith(".json")){n(new Error("Invalid file type. Please select a JSON file."));return}if(s.size>10*1024*1024){n(new Error("File size too large. Maximum size is 10MB."));return}const r=new FileReader;r.onload=a=>{try{const o=JSON.parse(a.target.result);if(!o||typeof o!="object"){n(new Error("Invalid data format"));return}e(o)}catch(o){console.error("Import parse error:",o),n(new Error("Failed to parse JSON file: "+o.message))}},r.onerror=()=>{console.error("File read error:",r.error),n(new Error("Failed to read file"))},r.readAsText(s)})}},c={...Ut,...Ht,...zt,...Gt,toggleTheme(){try{const t=(document.documentElement.getAttribute("data-theme")||"light")==="light"?"dark":"light";document.documentElement.setAttribute("data-theme",t),localStorage.setItem("theme",t)}catch(s){console.error("Theme toggle error:",s)}},showNotification(s,t="success"){try{document.querySelectorAll(".notification").forEach(r=>r.remove());const n=document.createElement("div");n.className=`notification notification-${t}`,n.setAttribute("role","status"),n.setAttribute("aria-live","polite"),n.textContent=s,n.style.cssText=`
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px 20px;
                border-radius: 8px;
                background: ${t==="success"?"#10b981":"#ef4444"};
                color: white;
                z-index: 10000;
                animation: slideIn 0.3s ease;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                max-width: 300px;
                word-wrap: break-word;
            `,document.body.appendChild(n),setTimeout(()=>{n.style.animation="slideOut 0.3s ease",setTimeout(()=>{n.parentNode&&n.remove()},300)},3e3)}catch(e){console.error("Notification error:",e)}},showConfirm(s){return new Promise(t=>{try{const e=confirm(s);t(e)}catch(e){console.error("Confirm dialog error:",e),t(!1)}})}};typeof window<"u"&&(window.Utilities=c);if(typeof document<"u"){const s=document.createElement("style");s.textContent=`
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }

        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
    `,document.head&&!document.getElementById("utils-animations")&&(s.id="utils-animations",document.head.appendChild(s))}const jt="PersonalFinanceDB",_t=1;class Wt{constructor(){this.db=null,this.stores=["savings","fixedDeposits","mutualFunds","stocks","crypto","liabilities","transactions","budgets","settings"]}async init(){return new Promise((t,e)=>{const n=indexedDB.open(jt,_t);n.onerror=()=>{console.error("Database error:",n.error),e(n.error)},n.onsuccess=()=>{this.db=n.result,t(this.db)},n.onupgradeneeded=r=>{const a=r.target.result;this.stores.forEach(o=>{if(!a.objectStoreNames.contains(o)){const i=a.createObjectStore(o,{keyPath:"id",autoIncrement:!0});o==="transactions"?(i.createIndex("date","date",{unique:!1}),i.createIndex("category","category",{unique:!1})):o!=="settings"&&o!=="budgets"&&i.createIndex("updated","updated",{unique:!1})}})}})}async save(t,e){return new Promise((n,r)=>{try{if(!this.db){r(new Error("Database not initialized"));return}const i=this.db.transaction([t],"readwrite").objectStore(t).put(e);i.onsuccess=()=>n(i.result),i.onerror=()=>{console.error("Save error:",i.error),r(i.error)}}catch(a){console.error("Transaction error:",a),r(a)}})}async getAll(t){return new Promise((e,n)=>{try{if(!this.db){n(new Error("Database not initialized"));return}const o=this.db.transaction([t],"readonly").objectStore(t).getAll();o.onsuccess=()=>e(o.result||[]),o.onerror=()=>{console.error("GetAll error:",o.error),n(o.error)}}catch(r){console.error("Transaction error:",r),n(r)}})}async getOne(t,e){return new Promise((n,r)=>{try{if(!this.db){r(new Error("Database not initialized"));return}const i=this.db.transaction([t],"readonly").objectStore(t).get(e);i.onsuccess=()=>n(i.result),i.onerror=()=>{console.error("GetOne error:",i.error),r(i.error)}}catch(a){console.error("Transaction error:",a),r(a)}})}async delete(t,e){return new Promise((n,r)=>{try{if(!this.db){r(new Error("Database not initialized"));return}const i=this.db.transaction([t],"readwrite").objectStore(t).delete(e);i.onsuccess=()=>n(),i.onerror=()=>{console.error("Delete error:",i.error),r(i.error)}}catch(a){console.error("Transaction error:",a),r(a)}})}async clear(t){return new Promise((e,n)=>{try{if(!this.db){n(new Error("Database not initialized"));return}const o=this.db.transaction([t],"readwrite").objectStore(t).clear();o.onsuccess=()=>e(),o.onerror=()=>{console.error("Clear error:",o.error),n(o.error)}}catch(r){console.error("Transaction error:",r),n(r)}})}}class Jt{constructor(t){this.dbManager=t,this.editingEntry=null,this.currentFormType="",this.app=null,this.fundNameSuggestions=[]}async showAddForm(t){if(this.currentFormType=t,this.editingEntry=null,t==="mutualFunds"){const n=await this.dbManager.getAll("mutualFunds");this.fundNameSuggestions=[...new Set(n.map(r=>r.fundName).filter(Boolean))]}else this.fundNameSuggestions=[];const e=this.getFormConfig(t);if(!e){c.showNotification("Form not available for this type","error");return}this.showModal(e.title,e.fields)}async showEditForm(t,e){if(this.currentFormType=t,this.editingEntry=await this.dbManager.getOne(t,e),t==="mutualFunds"){const r=await this.dbManager.getAll("mutualFunds");this.fundNameSuggestions=[...new Set(r.map(a=>a.fundName).filter(Boolean))]}else this.fundNameSuggestions=[];const n=this.getFormConfig(t);if(!n){c.showNotification("Form not available for this type","error");return}this.showModal(`Edit ${n.singularTitle||n.title.replace("Add ","")}`,n.fields,this.editingEntry)}showModal(t,e,n={}){const r=document.getElementById("dataModal"),a=document.getElementById("modalTitle"),o=document.getElementById("modalBody");a.textContent=t;let i='<form id="dataForm">';e.forEach(l=>{if(i+='<div class="form-group">',i+=`<label>${l.label}:</label>`,l.type==="select")i+=`<select id="field-${l.name}" class="form-input" ${l.required?"required":""}>`,l.options.forEach(d=>{const u=n[l.name]===d?"selected":"";i+=`<option value="${d}" ${u}>${d}</option>`}),i+="</select>";else if(l.type==="textarea")i+=`<textarea id="field-${l.name}" class="form-input" ${l.required?"required":""}>${n[l.name]||""}</textarea>`;else{const d=n[l.name]||"",u=l.suggestions&&l.suggestions.length>0?`list="list-${l.name}"`:"";i+=`<input type="${l.type}" id="field-${l.name}" value="${d}" class="form-input" ${l.required?"required":""} ${l.step?'step="'+l.step+'"':""} ${l.min!==void 0?'min="'+l.min+'"':""} ${u} />`,l.suggestions&&l.suggestions.length>0&&(i+=`<datalist id="list-${l.name}">`,l.suggestions.forEach(p=>{i+=`<option value="${p}"></option>`}),i+="</datalist>")}i+="</div>"}),i+="</form>",o.innerHTML=i,r.style.display="block"}async saveCurrentForm(){return this.saveForm()}async saveForm(){const t=this.getFormConfig(this.currentFormType);if(!t)return;const e=this.editingEntry?{...this.editingEntry}:{};let n=!0,r=[];if(t.fields.forEach(a=>{const o=document.getElementById(`field-${a.name}`);if(o){if(o.style.border="",a.required&&!o.value){n=!1,o.style.border="2px solid red",r.push(`${a.label} is required`);return}if(o.value)if(a.type==="number"){const i=parseFloat(o.value);if(isNaN(i)){n=!1,o.style.border="2px solid red",r.push(`${a.label} must be a valid number`);return}if(a.min!==void 0&&i<a.min){n=!1,o.style.border="2px solid red",r.push(`${a.label} must be at least ${a.min}`);return}if(i<0&&!a.allowNegative){n=!1,o.style.border="2px solid red",r.push(`${a.label} cannot be negative`);return}e[a.name]=i}else if(a.type==="date"){const i=new Date(o.value);if(isNaN(i.getTime())){n=!1,o.style.border="2px solid red",r.push(`${a.label} must be a valid date`);return}e[a.name]=o.value}else e[a.name]=o.value.trim()}}),n&&this.currentFormType==="fixedDeposits"&&e.maturity&&e.invested&&parseFloat(e.maturity)<parseFloat(e.invested)&&(n=!1,r.push("Maturity amount should be greater than or equal to invested amount")),n&&(this.currentFormType==="mutualFunds"||this.currentFormType==="stocks"||this.currentFormType==="crypto")&&e.invested&&e.current&&parseFloat(e.current)<parseFloat(e.invested)*.5&&console.warn("Current value is less than 50% of invested - significant loss detected"),!this.editingEntry&&this.currentFormType==="mutualFunds"){const a=await this.dbManager.getAll("mutualFunds"),o=(e.fundName||"").trim().toLowerCase(),i=a.find(l=>(l.fundName||"").trim().toLowerCase()===o);i&&(e.id=i.id,e.invested=(i.invested||0)+(e.invested||0),e.current=(i.current||0)+(e.current||0),e.units=(i.units||0)+(e.units||0),e.type=e.type||i.type,e.schemeCode=e.schemeCode||i.schemeCode,e.sip===void 0&&i.sip!==void 0&&(e.sip=i.sip))}if(!n){const a=r.length>0?r[0]:"Please fill all required fields correctly";c.showNotification(a,"error");return}e.updated=new Date().toISOString(),e.createdAt||(e.createdAt=e.updated);try{const a=await this.dbManager.save(this.currentFormType,e);return e.id||(e.id=a),c.showNotification(`${this.editingEntry?"Updated":"Added"} successfully`),this.closeModal(),this.app&&await this.app.refreshCurrentTab(),e}catch(a){console.error("Save error:",a),c.showNotification("Failed to save data: "+a.message,"error")}}closeModal(){const t=document.getElementById("dataModal");t.style.display="none",this.editingEntry=null,this.currentFormType=""}getFormConfig(t){return{savings:{title:"Add Savings Account",singularTitle:"Savings Account",fields:[{name:"bankName",label:"Bank Name",type:"text",required:!0},{name:"accountType",label:"Account Type",type:"select",options:["Savings","Current"],required:!0},{name:"balance",label:"Balance",type:"number",step:"0.01",min:0,required:!0}]},fixedDeposits:{title:"Add Fixed Deposit",singularTitle:"Fixed Deposit",fields:[{name:"bankName",label:"Bank Name",type:"text",required:!0},{name:"invested",label:"Invested Amount",type:"number",step:"0.01",min:0,required:!0},{name:"maturity",label:"Maturity Amount",type:"number",step:"0.01",min:0,required:!0},{name:"interestRate",label:"Interest Rate (%)",type:"number",step:"0.01",min:0,required:!0},{name:"startDate",label:"Start Date",type:"date",required:!0},{name:"maturityDate",label:"Maturity Date",type:"date",required:!0}]},mutualFunds:{title:"Add Mutual Fund",singularTitle:"Mutual Fund",fields:[{name:"fundName",label:"Fund Name",type:"text",required:!0,suggestions:this.fundNameSuggestions},{name:"schemeCode",label:"Scheme Code",type:"text",required:!0},{name:"units",label:"Units",type:"number",step:"0.0001",min:0,required:!0},{name:"invested",label:"Invested Amount",type:"number",step:"0.01",min:0,required:!0},{name:"current",label:"Current Value",type:"number",step:"0.01",min:0,required:!0},{name:"type",label:"Type",type:"select",options:["Equity","Debt","Hybrid","Index"],required:!0},{name:"sip",label:"SIP Amount",type:"number",step:"0.01",min:0,required:!1}]},stocks:{title:"Add Stock",singularTitle:"Stock",fields:[{name:"stockName",label:"Stock Name",type:"text",required:!0},{name:"ticker",label:"Ticker",type:"text",required:!0},{name:"quantity",label:"Quantity",type:"number",min:0,required:!0},{name:"invested",label:"Invested Amount",type:"number",step:"0.01",min:0,required:!0},{name:"current",label:"Current Value",type:"number",step:"0.01",min:0,required:!0},{name:"sector",label:"Sector",type:"text",required:!1}]},crypto:{title:"Add Crypto",singularTitle:"Crypto",fields:[{name:"coinName",label:"Coin Name",type:"text",required:!0},{name:"platform",label:"Platform",type:"text",required:!0},{name:"quantity",label:"Quantity",type:"number",step:"0.00000001",min:0,required:!0},{name:"invested",label:"Invested Amount",type:"number",step:"0.01",min:0,required:!0},{name:"current",label:"Current Value",type:"number",step:"0.01",min:0,required:!0}]},liabilities:{title:"Add Liability",singularTitle:"Liability",fields:[{name:"type",label:"Type",type:"select",options:["Home Loan","Car Loan","Personal Loan","Credit Card","Other"],required:!0},{name:"lender",label:"Lender",type:"text",required:!0},{name:"loanAmount",label:"Original Loan Amount",type:"number",step:"0.01",min:0,required:!0},{name:"outstanding",label:"Outstanding Amount",type:"number",step:"0.01",min:0,required:!0},{name:"interestRate",label:"Interest Rate (%)",type:"number",step:"0.01",min:0,required:!0},{name:"emi",label:"EMI Amount",type:"number",step:"0.01",min:0,required:!1}]},transactions:{title:"Add Transaction",singularTitle:"Transaction",fields:[{name:"date",label:"Date",type:"date",required:!0},{name:"type",label:"Type",type:"select",options:["income","expense"],required:!0},{name:"category",label:"Category",type:"select",options:["Salary","Food","Transport","Entertainment","Shopping","Bills","Healthcare","Investment","Other"],required:!0},{name:"amount",label:"Amount",type:"number",step:"0.01",min:0,required:!0},{name:"units",label:"Units",type:"number",step:"0.0001",min:0,required:!1},{name:"description",label:"Description",type:"text",required:!1}]},budgets:{title:"Add Budget",singularTitle:"Budget",fields:[{name:"category",label:"Category",type:"select",options:["Salary","Food","Transport","Entertainment","Shopping","Bills","Healthcare","Investment","Other"],required:!0},{name:"limit",label:"Monthly Limit",type:"number",step:"0.01",min:0,required:!0},{name:"notes",label:"Notes",type:"text",required:!1}]}}[t]}}class K{static async calculateNetWorthTotals(t){try{const e=await t.getAll("savings"),n=await t.getAll("fixedDeposits"),r=await t.getAll("mutualFunds"),a=await t.getAll("stocks"),o=await t.getAll("crypto"),i=await t.getAll("liabilities"),l=await c.getSettings(t),d=e.reduce((F,A)=>{const b=parseFloat(A.balance)||0;return F+(isNaN(b)?0:b)},0),u=n.reduce((F,A)=>{const b=parseFloat(A.invested)||0;return F+(isNaN(b)?0:b)},0),p=r.reduce((F,A)=>{const b=parseFloat(A.current)||0;return F+(isNaN(b)?0:b)},0),m=a.reduce((F,A)=>{const b=parseFloat(A.current)||0;return F+(isNaN(b)?0:b)},0),w=o.reduce((F,A)=>{const b=parseFloat(A.current)||0;return F+(isNaN(b)?0:b)},0),h=i.reduce((F,A)=>{const b=parseFloat(A.outstanding)||0;return F+(isNaN(b)?0:b)},0),v=parseFloat(l.epf)||0,S=parseFloat(l.ppf)||0,x=d+u+p+m+w+v+S-h;return{savings:d,fixedDeposits:u,mutualFunds:p,stocks:m,crypto:w,liabilities:h,epf:v,ppf:S,total:x}}catch(e){return console.error("Net worth calculation error:",e),c.showNotification("Failed to calculate net worth totals","error"),{savings:0,fixedDeposits:0,mutualFunds:0,stocks:0,crypto:0,liabilities:0,epf:0,ppf:0,total:0}}}static async calculateExpenseTotals(t){try{const e=await t.getAll("transactions"),n=new Date().getMonth(),r=new Date().getFullYear(),a=e.filter(l=>{try{const d=new Date(l.date);return!isNaN(d.getTime())&&d.getMonth()===n&&d.getFullYear()===r}catch{return console.warn("Invalid transaction date:",l.date),!1}}),o=a.filter(l=>l.type==="income").reduce((l,d)=>{const u=parseFloat(d.amount)||0;return l+(isNaN(u)?0:u)},0),i=a.filter(l=>l.type==="expense").reduce((l,d)=>{const u=parseFloat(d.amount)||0;return l+(isNaN(u)?0:u)},0);return{income:o,expenses:i,balance:o-i,transactionCount:a.length}}catch(e){return console.error("Expense totals calculation error:",e),c.showNotification("Failed to calculate expense totals","error"),{income:0,expenses:0,balance:0,transactionCount:0}}}static calculateCategoryExpenses(t){try{const e={};return t.filter(n=>n.type==="expense").forEach(n=>{const r=n.category||"Uncategorized",a=parseFloat(n.amount)||0;isNaN(a)||(e[r]=(e[r]||0)+a)}),e}catch(e){return console.error("Category expenses calculation error:",e),{}}}static calculateCAGR(t,e,n){if(!t||t<=0||!e||e<=0||!n||n<=0)return 0;try{const r=(Math.pow(e/t,1/n)-1)*100;return isNaN(r)||!isFinite(r)?0:r}catch(r){return console.error("CAGR calculation error:",r),0}}static calculateFDMaturity(t,e,n,r=4){if(!t||t<=0||!e||e<0||!n||n<=0)return t||0;try{const a=e/100,o=r,i=t*Math.pow(1+a/o,o*n);return isNaN(i)||!isFinite(i)?t:i}catch(a){return console.error("FD maturity calculation error:",a),t||0}}}async function Vt(s){const[t,e={},n=[],r=[],a=[],o=[]]=await Promise.all([K.calculateNetWorthTotals(s),c.getSettings(s),s.getAll("transactions"),s.getAll("mutualFunds"),s.getAll("stocks"),s.getAll("crypto")]),i=new Date,l=i.getMonth(),d=i.getFullYear(),u=n.reduce((y,g)=>{try{const f=new Date(g.date);if(isNaN(f.getTime())||f.getMonth()!==l||f.getFullYear()!==d)return y;const T=parseFloat(g.amount)||0;return isNaN(T)?y:g.type==="income"?y+T:g.type==="expense"?y-T:y}catch{return console.warn("Skipping invalid transaction for change calc:",g),y}},0),p=t.total,m=parseFloat(e.goal)||0,w=m>0,h=w?Math.min(p/m*100,100).toFixed(2):"0.00",v=p-u,S=v>0?u/v*100:0,x=`${S>=0?"+":""}${S.toFixed(2)}`,F=S>=0?"positive":"negative",A=t.savings+t.fixedDeposits+t.mutualFunds+t.stocks+t.crypto+t.epf+t.ppf,b=[{name:"Savings",value:t.savings,color:"#3b82f6"},{name:"Fixed Deposits",value:t.fixedDeposits,color:"#10b981"},{name:"Mutual Funds",value:t.mutualFunds,color:"#8c0bf5ff"},{name:"Stocks",value:t.stocks,color:"#ef4444"},{name:"Crypto",value:t.crypto,color:"#e9b05bff"},{name:"EPF",value:t.epf,color:"#06b6d4"},{name:"PPF",value:t.ppf,color:"#ec4899"}].filter(y=>y.value>0),ft=(y=>{if(!y)return"Not available";const g=new Date(y);if(isNaN(g.getTime()))return"Not available";const f=Nt=>String(Nt).padStart(2,"0"),T=f(g.getDate()),j=f(g.getMonth()+1),rt=String(g.getFullYear()).slice(-2),Ct=f(g.getHours()),Et=f(g.getMinutes());return`${T}-${j}-${rt} ${Ct}:${Et}`})(e.lastSync),M=r.reduce((y,g)=>{const f=parseFloat(g.invested);return y+(isNaN(f)?0:f)},0),Z=r.reduce((y,g)=>{const f=parseFloat(g.current);return y+(isNaN(f)?0:f)},0),R=Z-M,yt=M>0?(R/M*100).toFixed(2):0,I=a.reduce((y,g)=>{const f=parseFloat(g.invested);return y+(isNaN(f)?0:f)},0),tt=a.reduce((y,g)=>{const f=parseFloat(g.current);return y+(isNaN(f)?0:f)},0),U=tt-I,gt=I>0?(U/I*100).toFixed(2):0,P=o.reduce((y,g)=>{const f=parseFloat(g.invested);return y+(isNaN(f)?0:f)},0),et=o.reduce((y,g)=>{const f=parseFloat(g.current);return y+(isNaN(f)?0:f)},0),H=et-P,vt=P>0?(H/P*100).toFixed(2):0,z=M+I+P,G=Z+tt+et-z,bt=z>0?(G/z*100).toFixed(2):"0.00",wt=b.length>0?`<div class="allocation-bar">${b.map(y=>{const g=A>0?(y.value/A*100).toFixed(1):0;return`<div class="allocation-segment" style="width:${g}%;background:${y.color}" title="${y.name}: ${g}%"></div>`}).join("")}</div>`:'<p class="empty-state">Add assets to see allocation</p>',At={Savings:"savings","Fixed Deposits":"fixedDeposits","Mutual Funds":"mutualFunds",Stocks:"stocks",Crypto:"crypto"},Ft=b.length>0?`<div class="allocation-legend">${b.map(y=>{const g=A>0?(y.value/A*100).toFixed(1):0,f=At[y.name],T=f?`onclick="window.app.switchTab('${f}')"`:"",j=f?`onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();window.app.switchTab('${f}');}"`:"";return`<div class="legend-item" ${f?'role="button" tabindex="0" style="cursor:pointer;"':""} ${T} ${j}><span class="legend-color" style="background:${y.color}"></span><span class="legend-label">${y.name}</span><span class="legend-value">${g}%</span></div>`}).join("")}</div>`:"",St=`
        <div class="section-header">
            <h2>Dashboard</h2>
            <div style="display:flex; gap:10px; flex-wrap:wrap; justify-content:flex-end;">
                <button class="btn btn-primary" onclick="window.app.refreshAllLive()">🔄 Refresh Live</button>
            </div>
        </div>
        <div class="stat-grid">
            <div class="stat-card">
                <h3>Net Worth</h3>
                <p class="stat-value">${c.formatCurrency(p)}</p>
                <p class="stat-change ${F}">${x}% this month</p>
            </div>
            <div class="stat-card">
                <h3>Investments</h3>
                <p class="stat-value">${c.formatCurrency(t.mutualFunds+t.stocks+t.crypto)}</p>
            </div>
            <div class="stat-card">
                <h3>EPF & PPF</h3>
                <p class="stat-value">${c.formatCurrency(t.epf+t.ppf)}</p>
            </div>
            <div class="stat-card">
                <h3>Liabilities</h3>
                <p class="stat-value">${c.formatCurrency(t.liabilities)}</p>
            </div>
            <div class="stat-card">
                <h3>Goal Progress</h3>
                <div class="progress-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${h}">
                    <div class="progress-fill" style="width:${w?h:0}%"></div>
                </div>
                <p>${w?`${h}% of ${c.formatCurrency(m)}`:"Set a goal to track progress"}</p>
            </div>
        </div>
        <div class="breakdown">
            <h3>Asset Allocation</h3>
            ${wt}
            ${Ft}
        </div>
        <div class="section-header"></div>
        <div class="section-header"><h2>Investments P/L</h2></div>
        <div class="stat-grid">
            <div class="stat-card">
                <h3>Total P/L</h3>
                <p class="stat-value ${G>=0?"positive":"negative"}">${c.formatCurrency(G)}</p>
                <p class="stat-change">${bt}%</p>
            </div>
            <div class="stat-card">
                <h3>Mutual Funds P/L</h3>
                <p class="stat-value ${R>=0?"positive":"negative"}">${c.formatCurrency(R)}</p>
                <p class="stat-change">${yt}%</p>
            </div>
            <div class="stat-card">
                <h3>Stocks & ETF P/L</h3>
                <p class="stat-value ${U>=0?"positive":"negative"}">${c.formatCurrency(U)}</p>
                <p class="stat-change">${gt}%</p>
            </div>
            <div class="stat-card">
                <h3>Crypto P/L</h3>
                <p class="stat-value ${H>=0?"positive":"negative"}">${c.formatCurrency(H)}</p>
                <p class="stat-change">${vt}%</p>
            </div>
        </div>
        <div class="last-refreshed">Last Refreshed ${ft}</div>
    `;document.getElementById("content-dashboard").innerHTML=St}async function Yt(s){const t=await s.getAll("transactions"),e=await K.calculateExpenseTotals(s),n=new Date().getMonth(),r=new Date().getFullYear(),a=t.filter(i=>{const l=new Date(i.date);return l.getMonth()===n&&l.getFullYear()===r}).sort((i,l)=>new Date(l.date)-new Date(i.date));let o=`
        <div class="section-header">
            <h2>Monthly Expenses</h2>
            <button class="btn btn-primary" onclick="window.app.showAddTransactionForm()">➕ Add Transaction</button>
        </div>
        <div class="stat-grid">
            <div class="stat-card">
                <h3>Income</h3>
                <p class="stat-value positive">${c.formatCurrency(e.income)}</p>
            </div>
            <div class="stat-card">
                <h3>Expenses</h3>
                <p class="stat-value negative">${c.formatCurrency(e.expenses)}</p>
            </div>
            <div class="stat-card">
                <h3>Balance</h3>
                <p class="stat-value ${e.balance>=0?"positive":"negative"}">${c.formatCurrency(e.balance)}</p>
            </div>
            <div class="stat-card">
                <h3>Transactions</h3>
                <p class="stat-value">${e.transactionCount}</p>
            </div>
        </div>
        <div class="data-table-container">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Category</th>
                        <th>Description</th>
                        <th>Amount</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
    `;a.length===0?o+='<tr><td colspan="6" style="text-align: center;">No transactions yet</td></tr>':a.forEach(i=>{o+=`
                <tr>
                    <td>${c.formatDate(i.date)}</td>
                    <td><span class="badge badge-${i.type}">${i.type}</span></td>
                    <td>${i.category}</td>
                    <td>${i.description||"-"}</td>
                    <td class="${i.type==="income"?"positive":"negative"}">${c.formatCurrency(i.amount)}</td>
                    <td>
                        <button class="btn-icon" onclick="window.app.editTransaction(${i.id})" title="Edit">✏️</button>
                        <button class="btn-icon" onclick="window.app.deleteTransaction(${i.id})" title="Delete">🗑️</button>
                    </td>
                </tr>
            `}),o+="</tbody></table></div>",document.getElementById("content-expenses").innerHTML=o}async function Kt(s){const t=await s.getAll("savings"),e=t.reduce((r,a)=>r+(a.balance||0),0);let n=`
        <div class="section-header">
            <h2>Savings Accounts</h2>
            <button class="btn btn-primary" onclick="window.app.showAddForm('savings')">➕ Add Account</button>
        </div>
        <div class="stat-grid">
            <div class="stat-card">
                <h3>Total Savings</h3>
                <p class="stat-value">${c.formatCurrency(e)}</p>
            </div>
        </div>
        <div class="data-table-container">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Bank Name</th>
                        <th>Account Type</th>
                        <th>Balance</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
    `;t.length===0?n+='<tr><td colspan="4" style="text-align: center;">No savings accounts yet</td></tr>':t.forEach(r=>{n+=`
                <tr>
                    <td>${r.bankName||""}</td>
                    <td>${r.accountType||""}</td>
                    <td>${c.formatCurrency(r.balance||0)}</td>
                    <td>
                        <button class="btn-icon" onclick="window.app.editEntry('savings', ${r.id})" title="Edit">✏️</button>
                        <button class="btn-icon" onclick="window.app.deleteEntry('savings', ${r.id})" title="Delete">🗑️</button>
                    </td>
                </tr>
            `}),n+="</tbody></table></div>",document.getElementById("content-savings").innerHTML=n}async function Xt(s){const t=await s.getAll("fixedDeposits"),e={invested:t.reduce((r,a)=>r+(a.invested||0),0),maturity:t.reduce((r,a)=>r+(a.maturity||0),0)};let n=`
        <div class="section-header">
            <h2>Fixed Deposits</h2>
            <button class="btn btn-primary" onclick="window.app.showAddForm('fixedDeposits')">➕ Add FD</button>
        </div>
        <div class="stat-grid">
            <div class="stat-card">
                <h3>Total Invested</h3>
                <p class="stat-value">${c.formatCurrency(e.invested)}</p>
            </div>
            <div class="stat-card">
                <h3>Maturity Value</h3>
                <p class="stat-value">${c.formatCurrency(e.maturity)}</p>
            </div>
            <div class="stat-card">
                <h3>Expected Gain</h3>
                <p class="stat-value positive">${c.formatCurrency(e.maturity-e.invested)}</p>
            </div>
        </div>
        <div class="data-table-container">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Bank Name</th>
                        <th>Invested</th>
                        <th>Maturity</th>
                        <th>Interest Rate</th>
                        <th>Maturity Date</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
    `;t.length===0?n+='<tr><td colspan="6" style="text-align: center;">No fixed deposits yet</td></tr>':t.forEach(r=>{n+=`
                <tr>
                    <td>${r.bankName||""}</td>
                    <td>${c.formatCurrency(r.invested||0)}</td>
                    <td>${c.formatCurrency(r.maturity||0)}</td>
                    <td>${r.interestRate||0}%</td>
                    <td>${c.formatDate(r.maturityDate)}</td>
                    <td>
                        <button class="btn-icon" onclick="window.app.editEntry('fixedDeposits', ${r.id})" title="Edit">✏️</button>
                        <button class="btn-icon" onclick="window.app.deleteEntry('fixedDeposits', ${r.id})" title="Delete">🗑️</button>
                    </td>
                </tr>
            `}),n+="</tbody></table></div>",document.getElementById("content-fixedDeposits").innerHTML=n}async function Qt(s){const t=await s.getAll("mutualFunds"),e={invested:t.reduce((o,i)=>o+(i.invested||0),0),current:t.reduce((o,i)=>o+(i.current||0),0)},n=e.current-e.invested,r=e.invested>0?(n/e.invested*100).toFixed(2):0;let a=`
        <div class="section-header">
            <h2>Mutual Funds</h2>
            <div style="display:flex; gap:10px; flex-wrap:wrap; justify-content:flex-end;">
                <button class="btn btn-primary" onclick="window.app.refreshMutualFundsLive()">🔄 Refresh Live</button>
                <button class="btn btn-primary" onclick="window.app.showAddForm('mutualFunds')">➕ Add Fund</button>
            </div>
        </div>
        <div class="stat-grid">
            <div class="stat-card">
                <h3>Total Invested</h3>
                <p class="stat-value">${c.formatCurrency(e.invested)}</p>
            </div>
            <div class="stat-card">
                <h3>Current Value</h3>
                <p class="stat-value">${c.formatCurrency(e.current)}</p>
            </div>
            <div class="stat-card">
                <h3>Total P/L</h3>
                <p class="stat-value ${n>=0?"positive":"negative"}">${c.formatCurrency(n)}</p>
                <p class="stat-change">${r}%</p>
            </div>
        </div>
        <div class="data-table-container">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Fund Name</th>
                        <th>Type</th>
                        <th>Units</th>
                        <th>Invested</th>
                        <th>Current</th>
                        <th>P/L</th>
                        <th>P/L %</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
    `;t.length===0?a+='<tr><td colspan="8" style="text-align: center;">No mutual funds yet</td></tr>':t.forEach(o=>{const i=c.calculatePL(o.invested||0,o.current||0);a+=`
                <tr>
                    <td>${o.fundName||""}</td>
                    <td>${o.type||""}</td>
                    <td>${o.units||0}</td>
                    <td>${c.formatCurrency(o.invested||0)}</td>
                    <td>${c.formatCurrency(o.current||0)}</td>
                    <td class="${i.pl>=0?"positive":"negative"}">${c.formatCurrency(i.pl)}</td>
                    <td class="${i.pl>=0?"positive":"negative"}">${i.plPercent}%</td>
                    <td>
                        <button class="btn-icon" onclick="window.app.editEntry('mutualFunds', ${o.id})" title="Edit">✏️</button>
                        <button class="btn-icon" onclick="window.app.deleteEntry('mutualFunds', ${o.id})" title="Delete">🗑️</button>
                    </td>
                </tr>
            `}),a+="</tbody></table></div>",document.getElementById("content-mutualFunds").innerHTML=a}async function Zt(s){const t=await s.getAll("stocks"),e={invested:t.reduce((o,i)=>o+(i.invested||0),0),current:t.reduce((o,i)=>o+(i.current||0),0)},n=e.current-e.invested,r=e.invested>0?(n/e.invested*100).toFixed(2):0;let a=`
        <div class="section-header">
            <h2>Stocks</h2>
            <div style="display:flex; gap:10px; flex-wrap:wrap; justify-content:flex-end;">
                <button class="btn btn-primary" onclick="window.app.refreshStocksLive()">🔄 Refresh Live</button>
                <button class="btn btn-primary" onclick="window.app.showAddForm('stocks')">➕ Add Stock</button>
            </div>
        </div>
        <div class="stat-grid">
            <div class="stat-card">
                <h3>Total Invested</h3>
                <p class="stat-value">${c.formatCurrency(e.invested)}</p>
            </div>
            <div class="stat-card">
                <h3>Current Value</h3>
                <p class="stat-value">${c.formatCurrency(e.current)}</p>
            </div>
            <div class="stat-card">
                <h3>Total P/L</h3>
                <p class="stat-value ${n>=0?"positive":"negative"}">${c.formatCurrency(n)}</p>
                <p class="stat-change">${r}%</p>
            </div>
        </div>
        <div class="data-table-container">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Stock Name</th>
                        <th>Ticker</th>
                        <th>Quantity</th>
                        <th>Invested</th>
                        <th>Current</th>
                        <th>P/L</th>
                        <th>P/L %</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
    `;t.length===0?a+='<tr><td colspan="8" style="text-align: center;">No stocks yet</td></tr>':t.forEach(o=>{const i=c.calculatePL(o.invested||0,o.current||0);a+=`
                <tr>
                    <td>${o.stockName||""}</td>
                    <td>${o.ticker||""}</td>
                    <td>${o.quantity||0}</td>
                    <td>${c.formatCurrency(o.invested||0)}</td>
                    <td>${c.formatCurrency(o.current||0)}</td>
                    <td class="${i.pl>=0?"positive":"negative"}">${c.formatCurrency(i.pl)}</td>
                    <td class="${i.pl>=0?"positive":"negative"}">${i.plPercent}%</td>
                    <td>
                        <button class="btn-icon" onclick="window.app.editEntry('stocks', ${o.id})" title="Edit">✏️</button>
                        <button class="btn-icon" onclick="window.app.deleteEntry('stocks', ${o.id})" title="Delete">🗑️</button>
                    </td>
                </tr>
            `}),a+="</tbody></table></div>",document.getElementById("content-stocks").innerHTML=a}async function te(s){const t=await s.getAll("crypto"),e={invested:t.reduce((p,m)=>p+(m.invested||0),0),current:t.reduce((p,m)=>p+(m.current||0),0)},n=e.current-e.invested,r=e.invested>0?(n/e.invested*100).toFixed(2):0;let a=`
        <div class="section-header">
            <h2>Cryptocurrency</h2>
            <div style="display:flex; gap:10px; flex-wrap:wrap; justify-content:flex-end;">
                <button class="btn btn-primary" onclick="window.app.refreshCryptoLive()">🔄 Refresh Live</button>
                <button class="btn btn-primary" onclick="window.app.showAddForm('crypto')">➕ Add Crypto</button>
            </div>
        </div>
        <div class="stat-grid">
            <div class="stat-card">
                <h3>Total Invested</h3>
                <p class="stat-value">${c.formatCurrency(e.invested)}</p>
            </div>
            <div class="stat-card">
                <h3>Current Value</h3>
                <p class="stat-value">${c.formatCurrency(e.current)}</p>
            </div>
            <div class="stat-card">
                <h3>Total P/L</h3>
                <p class="stat-value ${n>=0?"positive":"negative"}">${c.formatCurrency(n)}</p>
                <p class="stat-change">${r}%</p>
            </div>
        </div>
        <div class="data-table-container">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Coin Name</th>
                        <th>Platform</th>
                        <th>Quantity</th>
                        <th>Invested</th>
                        <th>Current</th>
                        <th>P/L</th>
                        <th>P/L %</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
    `;t.length===0?a+='<tr><td colspan="8" style="text-align: center;">No crypto holdings yet</td></tr>':t.forEach(p=>{const m=c.calculatePL(p.invested||0,p.current||0);a+=`
                <tr>
                    <td>${p.coinName||""}</td>
                    <td>${p.platform||""}</td>
                    <td>${p.quantity||0}</td>
                    <td>${c.formatCurrency(p.invested||0)}</td>
                    <td>${c.formatCurrency(p.current||0)}</td>
                    <td class="${m.pl>=0?"positive":"negative"}">${c.formatCurrency(m.pl)}</td>
                    <td class="${m.pl>=0?"positive":"negative"}">${m.plPercent}%</td>
                    <td>
                        <button class="btn-icon" onclick="window.app.editEntry('crypto', ${p.id})" title="Edit">✏️</button>
                        <button class="btn-icon" onclick="window.app.deleteEntry('crypto', ${p.id})" title="Delete">🗑️</button>
                    </td>
                </tr>
            `});const i=t.filter(p=>{const m=(p.coinName||"").toString().trim().toUpperCase();return m==="BTC"||m==="BITCOIN"}).reduce((p,m)=>p+(parseFloat(m.quantity)||0),0),l=.05,d=Math.min(i/l*100,100).toFixed(2),u=(i/l*100).toFixed(2);a+=`</tbody></table></div>
        <div class="breakdown" style="margin-top:20px;">
            <h3>BTC Ownership</h3>
            <p style="margin-bottom:8px;">Total BTC: ${i.toFixed(8)} / Target: ${l.toFixed(2)} BTC</p>
            <div class="progress-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${d}">
                <div class="progress-fill" style="width:${d}%"></div>
            </div>
            <p style="margin-top:8px; opacity:0.8;">${u}% owned (target ${l.toFixed(2)} BTC)</p>
        </div>`,document.getElementById("content-crypto").innerHTML=a}async function ee(s){const t=await s.getAll("liabilities"),e={loanAmount:t.reduce((a,o)=>a+(o.loanAmount||0),0),outstanding:t.reduce((a,o)=>a+(o.outstanding||0),0)},n=e.loanAmount-e.outstanding;let r=`
        <div class="section-header">
            <h2>Liabilities</h2>
            <button class="btn btn-primary" onclick="window.app.showAddForm('liabilities')">➕ Add Liability</button>
        </div>
        <div class="stat-grid">
            <div class="stat-card">
                <h3>Total Outstanding</h3>
                <p class="stat-value negative">${c.formatCurrency(e.outstanding)}</p>
            </div>
            <div class="stat-card">
                <h3>Original Amount</h3>
                <p class="stat-value">${c.formatCurrency(e.loanAmount)}</p>
            </div>
            <div class="stat-card">
                <h3>Amount Paid</h3>
                <p class="stat-value positive">${c.formatCurrency(n)}</p>
            </div>
        </div>
        <div class="data-table-container">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Type</th>
                        <th>Lender</th>
                        <th>Original Amount</th>
                        <th>Outstanding</th>
                        <th>Interest Rate</th>
                        <th>EMI</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
    `;t.length===0?r+='<tr><td colspan="7" style="text-align: center;">No liabilities yet</td></tr>':t.forEach(a=>{r+=`
                <tr>
                    <td>${a.type||""}</td>
                    <td>${a.lender||""}</td>
                    <td>${c.formatCurrency(a.loanAmount||0)}</td>
                    <td>${c.formatCurrency(a.outstanding||0)}</td>
                    <td>${a.interestRate||0}%</td>
                    <td>${a.emi?c.formatCurrency(a.emi):"N/A"}</td>
                    <td>
                        <button class="btn-icon" onclick="window.app.editEntry('liabilities', ${a.id})" title="Edit">✏️</button>
                        <button class="btn-icon" onclick="window.app.deleteEntry('liabilities', ${a.id})" title="Delete">🗑️</button>
                    </td>
                </tr>
            `}),r+="</tbody></table></div>",document.getElementById("content-liabilities").innerHTML=r}async function re(s){const[t=[],e=[]]=await Promise.all([s.getAll("budgets"),s.getAll("transactions")]),n=new Date,r=n.getMonth(),a=n.getFullYear(),o=e.filter(h=>{try{const v=new Date(h.date);return!isNaN(v.getTime())&&v.getMonth()===r&&v.getFullYear()===a}catch{return console.warn("Invalid transaction for budget calc:",h),!1}}),i=K.calculateCategoryExpenses(o),l=t.map(h=>{const v=parseFloat(h.limit)||0,S=i[h.category]||0,x=v-S,F=v>0?Math.min(S/v*100,999).toFixed(1):"0.0";return{...h,limit:v,actual:S,remaining:x,progress:F}}),d=l.reduce((h,v)=>h+(isNaN(v.limit)?0:v.limit),0),u=l.reduce((h,v)=>h+(isNaN(v.actual)?0:v.actual),0),p=d-u,m=l.filter(h=>h.actual>h.limit&&h.limit>0).map(h=>`${h.category}: ${c.formatCurrency(h.actual-h.limit)} over`);m.length>0&&c.showNotification(`Overspent budgets - ${m.join(", ")}`,"error");let w=`
        <div class="section-header">
            <h2>Budgets</h2>
            <button class="btn btn-primary" onclick="window.app.showAddForm('budgets')">➕ Add Budget</button>
        </div>
        <div class="stat-grid">
            <div class="stat-card">
                <h3>Total Budget</h3>
                <p class="stat-value">${c.formatCurrency(d)}</p>
            </div>
            <div class="stat-card">
                <h3>Actual Spend</h3>
                <p class="stat-value">${c.formatCurrency(u)}</p>
            </div>
            <div class="stat-card">
                <h3>Remaining</h3>
                <p class="stat-value ${p>=0?"positive":"negative"}">${c.formatCurrency(p)}</p>
            </div>
        </div>
        <div class="data-table-container">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Category</th>
                        <th>Monthly Budget</th>
                        <th>Actual (Month)</th>
                        <th>Remaining</th>
                        <th>Progress</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
    `;l.length===0?w+='<tr><td colspan="6" style="text-align:center;">No budgets yet</td></tr>':l.forEach(h=>{const v=h.actual>h.limit&&h.limit>0,S=!v&&h.limit>0&&h.actual>=h.limit*.9,x=h.limit>0?Math.min(h.actual/h.limit*100,100):0;w+=`
                <tr>
                    <td>${h.category}</td>
                    <td>${c.formatCurrency(h.limit)}</td>
                    <td class="${v?"negative":"positive"}">${c.formatCurrency(h.actual)}</td>
                    <td class="${v?"negative":"positive"}">${c.formatCurrency(h.remaining)}</td>
                    <td>
                        <div class="progress-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${x.toFixed(1)}">
                            <div class="progress-fill" style="width:${x}%"></div>
                        </div>
                        <p class="stat-change ${v?"negative":S?"warning":"positive"}">${h.progress}% used</p>
                    </td>
                    <td>
                        <button class="btn-icon" onclick="window.app.editEntry('budgets', ${h.id})" title="Edit">✏️</button>
                        <button class="btn-icon" onclick="window.app.deleteEntry('budgets', ${h.id})" title="Delete">🗑️</button>
                    </td>
                </tr>
            `}),w+="</tbody></table></div>",document.getElementById("content-budgets").innerHTML=w}class ne{constructor(){this.dbManager=new Wt,this.formHandler=null,this.currentTab="dashboard",this.sidebarCollapsed=!1,this.userSidebarPref=null,this.isSettingsModal=!1,this.renderers={dashboard:Vt,expenses:Yt,savings:Kt,fixedDeposits:Xt,mutualFunds:Qt,stocks:Zt,crypto:te,liabilities:ee,budgets:re}}getRefreshMeta(){try{return JSON.parse(localStorage.getItem("refreshMeta")||"{}")}catch(t){return console.warn("Failed to parse refresh meta",t),{}}}saveRefreshMeta(t){try{localStorage.setItem("refreshMeta",JSON.stringify(t))}catch(e){console.warn("Failed to save refresh meta",e)}}shouldAutoRefresh(t){const e=new Date,n=e.getHours(),r=e.toISOString().slice(0,10),a=this.getRefreshMeta();if(t==="stocks")return n>=17&&a.stocksLast!==r;if(t==="mutualFunds"){const o=n<10?"morning":n>=17?"evening":null;return o?(a.mutualFundsLast||{})[o]!==r:!1}return t==="crypto"}markRefresh(t){const e=new Date,n=e.toISOString().slice(0,10),r=e.getHours(),a=this.getRefreshMeta();if(t==="stocks")a.stocksLast=n;else if(t==="mutualFunds"){const o=r<10?"morning":r>=17?"evening":null;a.mutualFundsLast||(a.mutualFundsLast={}),o&&(a.mutualFundsLast[o]=n)}else t==="crypto"&&(a.cryptoLast=e.toISOString());this.saveRefreshMeta(a)}async autoRefreshOnOpen(){const t=[];if(this.shouldAutoRefresh("stocks")&&t.push(this.refreshStocksLive()),this.shouldAutoRefresh("mutualFunds")&&t.push(this.refreshMutualFundsLive()),this.shouldAutoRefresh("crypto")&&t.push(this.refreshCryptoLive()),t.length!==0)try{await Promise.all(t),await this.renderCurrentTab()}catch(e){console.warn("Auto-refresh on open failed",e)}}async fetchJsonWithProxies(t){const e=[{build:r=>`https://api.allorigins.win/raw?url=${encodeURIComponent(r)}`,normalize:r=>r.json()},{build:r=>`https://api.allorigins.win/get?url=${encodeURIComponent(r)}`,normalize:async r=>{const a=await r.json();return JSON.parse((a==null?void 0:a.contents)||"{}")}},{build:r=>`https://corsproxy.io/?${encodeURIComponent(r)}`,normalize:r=>r.json()},{build:r=>`https://thingproxy.freeboard.io/fetch/${r}`,normalize:r=>r.json()},{build:r=>r,normalize:r=>r.json(),options:{mode:"cors",cache:"no-store"}}],n=8e3;for(const r of e){const a=r.build(t),o=new AbortController,i=setTimeout(()=>o.abort(),n);try{const l=await fetch(a,{mode:"cors",cache:"no-store",signal:o.signal,...r.options||{}});if(clearTimeout(i),!l.ok)continue;return await r.normalize(l)}catch(l){clearTimeout(i),console.warn("Proxy fetch failed",a,l)}}throw new Error("All proxy fetch attempts failed")}async updateLastSync(){try{const t=await c.getSettings(this.dbManager);t.lastSync=new Date().toISOString(),await this.dbManager.save("settings",t)}catch(t){console.warn("Failed to update last sync timestamp",t)}}async init(){try{await this.dbManager.init(),this.formHandler=new Jt(this.dbManager),this.formHandler.app=this,this.loadTheme(),this.loadSidebarState(),await this.initializeDefaultData(),this.setupEventListeners(),await this.switchTab("dashboard"),this.autoRefreshOnOpen()}catch(t){console.error("App initialization error:",t),c.showNotification("Failed to initialize app. Please refresh the page.","error")}}async refreshStocksLive(){var t,e;try{const r=(await this.dbManager.getAll("stocks")).filter(u=>{const p=(u.ticker||"").toString().trim().toUpperCase(),m=(u.stockName||"").toString().trim().toUpperCase();return p==="GOLDBEES"||m==="GOLDBEES"});if(r.length===0){c.showNotification("No GOLDBEES holdings to refresh","error");return}const o=await this.fetchJsonWithProxies("https://query1.finance.yahoo.com/v7/finance/quote?symbols=GOLDBEES.NS"),i=((e=(t=o==null?void 0:o.quoteResponse)==null?void 0:t.result)==null?void 0:e[0])||{},l=i.regularMarketPrice??i.postMarketPrice??i.previousClose??i.ask??i.bid??i.lastPrice??i.lastTradePrice,d=parseFloat(l);if(!d||Number.isNaN(d))throw console.error("Unexpected Yahoo quote payload",i),new Error("Invalid price data");for(const u of r){const m=(parseFloat(u.quantity)||0)*d;await this.dbManager.save("stocks",{...u,current:m})}this.markRefresh("stocks"),await this.updateLastSync(),c.showNotification("GOLDBEES price refreshed"),await this.renderCurrentTab()}catch(n){console.error("Stocks refresh error:",n),c.showNotification("Failed to refresh GOLDBEES price","error")}}async refreshMutualFundsLive(){var t,e;try{const n=await this.dbManager.getAll("mutualFunds");if(!n.length){c.showNotification("No mutual funds to refresh","error");return}const r=[];let a=0;for(const o of n){const i=(o.schemeCode||"").toString().trim();if(!i){a+=1;continue}const l=`https://api.mfapi.in/mf/${i}/latest`,d=await this.fetchJsonWithProxies(l),u=(e=(t=d==null?void 0:d.data)==null?void 0:t[0])==null?void 0:e.nav,p=parseFloat(u);if(!p||isNaN(p))continue;const w=(parseFloat(o.units)||0)*p;r.push({...o,current:w})}for(const o of r)await this.dbManager.save("mutualFunds",o);r.length>0&&(this.markRefresh("mutualFunds"),await this.updateLastSync()),r.length===0?c.showNotification("No mutual fund prices updated","error"):c.showNotification("Mutual fund prices refreshed"),a>0&&c.showNotification(`${a} fund(s) missing scheme code; please edit to refresh`,"error"),await this.renderCurrentTab()}catch(n){console.error("Mutual fund refresh error:",n),c.showNotification("Failed to refresh mutual fund prices","error")}}async initializeDefaultData(){try{(await this.dbManager.getAll("settings")).length===0&&await this.dbManager.save("settings",{id:1,currency:"INR",goal:15e6,epf:0,ppf:0,theme:"light",lastSync:new Date().toISOString()})}catch(t){console.error("Default data initialization error:",t)}}loadTheme(){try{const t=localStorage.getItem("theme")||"light";document.documentElement.setAttribute("data-theme",t);const e=document.getElementById("themeToggle");e&&(e.textContent=t==="light"?"🌙":"☀️")}catch(t){console.error("Theme load error:",t)}}loadSidebarState(){try{const t=localStorage.getItem("sidebarCollapsed");this.userSidebarPref=t===null?null:t==="true",this.updateResponsiveLayout()}catch(t){console.error("Sidebar state load error:",t)}}toggleSidebar(){try{this.setSidebarCollapsed(!this.sidebarCollapsed,!0)}catch(t){console.error("Sidebar toggle error:",t)}}setSidebarCollapsed(t,e=!1){this.sidebarCollapsed=t;const n=document.querySelector(".sidebar"),r=document.querySelector(".main-content"),a=document.getElementById("sidebarToggle");n&&(t?n.classList.add("collapsed"):n.classList.remove("collapsed")),r&&(t?r.classList.add("expanded"):r.classList.remove("expanded")),a&&(a.textContent=t?"☰":"✕",a.setAttribute("aria-expanded",(!t).toString())),e&&(this.userSidebarPref=t,localStorage.setItem("sidebarCollapsed",t))}updateResponsiveLayout(){const t=window.innerWidth<=900,e=document.querySelector(".app-container"),n=document.querySelector(".sidebar"),r=document.querySelector(".main-content"),a=document.getElementById("sidebarToggle");e&&e.classList.toggle("mobile",t),n&&n.classList.toggle("mobile",t),r&&r.classList.toggle("mobile",t),a&&a.classList.toggle("mobile",t);const o=t?!0:this.userSidebarPref??!1;this.setSidebarCollapsed(o,!1)}setupEventListeners(){try{const t=document.querySelector(".close");t&&(t.onclick=()=>this.closeModal()),window.onclick=a=>{const o=document.getElementById("dataModal");a.target===o&&this.closeModal()};const e=document.getElementById("themeToggle");e&&(e.onclick=()=>{c.toggleTheme(),this.loadTheme()});const n=document.getElementById("sidebarToggle");n&&(n.onclick=()=>this.toggleSidebar()),window.addEventListener("resize",()=>{this.updateResponsiveLayout()}),document.querySelectorAll(".sidebar-item").forEach(a=>{a.setAttribute("role","button"),a.setAttribute("tabindex","0");const o=a.getAttribute("data-tab"),i=()=>{o&&(this.switchTab(o),window.innerWidth<=900&&this.setSidebarCollapsed(!0,!1))};a.addEventListener("click",i),a.addEventListener("keydown",l=>{(l.key==="Enter"||l.key===" ")&&(l.preventDefault(),i())})})}catch(t){console.error("Event listeners setup error:",t)}}async switchTab(t){try{this.currentTab=t,document.querySelectorAll(".content").forEach(n=>n.classList.remove("active")),document.querySelectorAll(".sidebar-item").forEach(n=>{n.classList.remove("active")});const e=document.getElementById(`content-${t}`);e&&e.classList.add("active"),document.querySelectorAll(".sidebar-item").forEach(n=>{n.getAttribute("data-tab")===t&&n.classList.add("active")}),await this.renderCurrentTab()}catch(e){console.error("Tab switch error:",e),c.showNotification("Failed to switch tab","error")}}async renderCurrentTab(){try{const t=this.renderers[this.currentTab];t&&await t(this.dbManager)}catch(t){console.error("Render error:",t),c.showNotification("Failed to render content","error")}}async refreshCurrentTab(){await this.renderCurrentTab()}async refreshCryptoLive(){var t;try{const e=await this.dbManager.getAll("crypto"),n={BTC:"bitcoin",BITCOIN:"bitcoin",ETH:"ethereum",ETHEREUM:"ethereum",SOL:"solana",SOLANA:"solana",ADA:"cardano",CARDANO:"cardano",MATIC:"matic-network",POLYGON:"matic-network",DOGE:"dogecoin",DOGECOIN:"dogecoin",XRP:"ripple",RIPPLE:"ripple"},r=new Set,a=e.map(u=>{const p=(u.coinName||"").toString().trim(),m=p.toUpperCase(),w=n[m]||p.toLowerCase().replace(/\s+/g,"-");return w&&r.add(w),{holding:u,id:w}}).filter(u=>u.id);if(r.size===0){c.showNotification("No recognizable coins to refresh","error");return}const o=Array.from(r).join(","),i=await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${o}&vs_currencies=inr`);if(!i.ok)throw new Error("Price fetch failed");const l=await i.json(),d=[];for(const{holding:u,id:p}of a){const m=(t=l==null?void 0:l[p])==null?void 0:t.inr;if(!m||isNaN(m))continue;const h=(parseFloat(u.quantity)||0)*m;d.push({...u,current:h})}for(const u of d)await this.dbManager.save("crypto",u);d.length===0?c.showNotification("No prices updated (unmatched coins)","error"):c.showNotification("Crypto prices refreshed"),d.length>0&&(this.markRefresh("crypto"),await this.updateLastSync()),await this.renderCurrentTab()}catch(e){console.error("Crypto refresh error:",e),c.showNotification("Failed to refresh BTC price","error")}}async refreshAllLive(){try{await Promise.all([this.refreshCryptoLive(),this.refreshStocksLive(),this.refreshMutualFundsLive()]),await this.updateLastSync(),await this.renderCurrentTab()}catch(t){console.error("All live refresh error:",t),c.showNotification("Failed to refresh all prices","error")}}showAddForm(t){this.isSettingsModal=!1,this.formHandler.showAddForm(t)}showAddTransactionForm(){this.isSettingsModal=!1,this.formHandler.showAddForm("transactions")}async editEntry(t,e){this.isSettingsModal=!1,await this.formHandler.showEditForm(t,e)}async editTransaction(t){this.isSettingsModal=!1,await this.formHandler.showEditForm("transactions",t)}async deleteEntry(t,e){if(await c.showConfirm("Are you sure you want to delete this entry?"))try{await this.dbManager.delete(t,e),c.showNotification("Entry deleted successfully"),await this.refreshCurrentTab()}catch(r){console.error("Delete error:",r),c.showNotification("Failed to delete entry","error")}}async deleteTransaction(t){await this.deleteEntry("transactions",t)}async deleteItem(t,e){await this.dbManager.delete(t,e),window.syncAdapter&&await window.syncAdapter.softDeleteEntry(e),await this.refreshCurrentTab()}async saveModalData(){if(!this.formHandler)return;const t=await this.formHandler.saveCurrentForm();t&&window.syncAdapter&&await window.syncAdapter.saveEntry({id:t.id,type:t.type||t.category||"entry",amount:t.amount||t.value||0,createdAt:t.createdAt}),await this.refreshCurrentTab()}closeModal(){const t=document.getElementById("dataModal");t.style.display="none",this.isSettingsModal=!1,this.formHandler&&this.formHandler.closeModal()}async showSettings(){try{this.isSettingsModal=!0;const t=await c.getSettings(this.dbManager),e=`
                <div class="form-group">
                    <label>Currency:</label>
                    <input type="text" id="setting-currency" value="${t.currency}" class="form-input" />
                </div>
                <div class="form-group">
                    <label>Financial Goal:</label>
                    <input type="number" id="setting-goal" value="${t.goal}" class="form-input" step="1000" min="0" />
                </div>
                <div class="form-group">
                    <label>EPF Balance:</label>
                    <input type="number" id="setting-epf" value="${t.epf}" class="form-input" step="0.01" min="0" />
                </div>
                <div class="form-group">
                    <label>PPF Balance:</label>
                    <input type="number" id="setting-ppf" value="${t.ppf}" class="form-input" step="0.01" min="0" />
                </div>
                <div class="form-actions">
                    <button type="button" id="setting-reset" class="btn btn-secondary">Reset settings</button>
                    <button type="button" id="data-reset" class="btn btn-danger">Reset all data</button>
                </div>
            `,n=document.getElementById("dataModal"),r=document.getElementById("modalTitle"),a=document.getElementById("modalBody");r.textContent="Settings",a.innerHTML=e,n.style.display="block";const o=document.getElementById("setting-reset");o&&(o.onclick=()=>this.resetSettings());const i=document.getElementById("data-reset");i&&(i.onclick=()=>this.resetAllData())}catch(t){console.error("Show settings error:",t),c.showNotification("Failed to load settings","error")}}async saveSettings(){try{const t=await c.getSettings(this.dbManager),e=parseFloat(document.getElementById("setting-goal").value),n=parseFloat(document.getElementById("setting-epf").value),r=parseFloat(document.getElementById("setting-ppf").value);if(e<0||n<0||r<0){c.showNotification("Values cannot be negative","error");return}t.currency=document.getElementById("setting-currency").value,t.goal=e,t.epf=n,t.ppf=r,t.lastSync=new Date().toISOString(),await this.dbManager.save("settings",t),window.syncAdapter&&await window.syncAdapter.saveEntry({id:"settings",type:"settings",amount:0,createdAt:t.lastSync}),c.showNotification("Settings saved successfully"),this.closeModal(),await this.refreshCurrentTab()}catch(t){console.error("Save settings error:",t),c.showNotification("Failed to save settings","error")}}async resetSettings(){try{if(!await c.showConfirm("Reset settings to defaults? This will overwrite your current values."))return;const e={...L.settings,lastSync:new Date().toISOString()};await this.dbManager.save("settings",e),window.syncAdapter&&await window.syncAdapter.saveEntry({id:"settings",type:"settings",amount:0,createdAt:e.lastSync}),c.showNotification("Settings reset to defaults"),this.closeModal(),await this.refreshCurrentTab()}catch(t){console.error("Reset settings error:",t),c.showNotification("Failed to reset settings","error")}}async resetAllData(){try{if(!await c.showConfirm("This will erase ALL data (transactions, assets, liabilities, settings). Proceed?"))return;for(const e of this.dbManager.stores)await this.dbManager.clear(e);await this.dbManager.save("settings",{...L.settings,lastSync:new Date().toISOString()}),c.showNotification("All data reset to defaults"),this.closeModal(),await this.switchTab("dashboard")}catch(t){console.error("Reset all data error:",t),c.showNotification("Failed to reset all data","error")}}async exportAllData(){try{const t={};for(const e of this.dbManager.stores)t[e]=await this.dbManager.getAll(e);c.exportData(t),c.showNotification("Data exported successfully")}catch(t){console.error("Export error:",t),c.showNotification("Failed to export data","error")}}async importAllData(){const t=document.createElement("input");t.type="file",t.accept=".json",t.onchange=async e=>{try{const n=e.target.files[0],r=await c.importData(n,this.dbManager);if(!await c.showConfirm("Importing will replace existing data. Continue?"))return;for(const l of this.dbManager.stores)await this.dbManager.clear(l);const o={savings:{bank:"bankName",type:"accountType"},fixedDeposits:{bank:"bankName",rate:"interestRate"},mutualFunds:{name:"fundName",code:"schemeCode",scheme_code:"schemeCode"},stocks:{name:"stockName"},crypto:{coin:"coinName"},liabilities:{rate:"interestRate"}};for(const l of this.dbManager.stores)if(r[l]){const d=Array.isArray(r[l])?r[l]:[r[l]];for(const u of d){if(o[l]){const m=o[l];for(const[w,h]of Object.entries(m))u[w]!==void 0&&u[h]===void 0&&(u[h]=u[w])}const p={...u};l!=="settings"&&delete p.id,await this.dbManager.save(l,p)}}(Array.isArray(r.settings)?r.settings.length>0:!!r.settings)||await this.dbManager.save("settings",{...L.settings,lastSync:new Date().toISOString()}),c.showNotification("Data imported successfully"),await this.refreshCurrentTab()}catch(n){console.error("Import error:",n),c.showNotification("Failed to import data: "+n.message,"error")}},t.click()}}const ae={apiKey:"AIzaSyDJXjPnMJ5arqRLP7Us1_KdV55za2GhEJQ",authDomain:"finance-tracker-5b1d0.firebaseapp.com",projectId:"finance-tracker-5b1d0",storageBucket:"finance-tracker-5b1d0.firebasestorage.app",messagingSenderId:"905722679692",appId:"1:905722679692:web:3aeb0a0664bd8e20ab46a9"},it=nt().length?nt()[0]:$t(ae),X=xt(it),se=Mt(it),oe=new Tt;let k=null;async function ie(){return k=(await Dt(X,oe)).user,k}async function ce(){await Lt(X),k=null}function le(s){return kt(X,t=>{k=t,s(t)})}function ct(){return k}const at="finance_salt",lt=new TextEncoder,de=new TextDecoder;function J(s){return btoa(String.fromCharCode(...new Uint8Array(s)))}function V(s){return Uint8Array.from(atob(s),t=>t.charCodeAt(0))}function ue(){let s=localStorage.getItem(at);if(!s){const t=crypto.getRandomValues(new Uint8Array(16));s=J(t.buffer),localStorage.setItem(at,s)}return s}async function pe(s,t=ue()){const e=`${s}:${t}`,n=await crypto.subtle.importKey("raw",lt.encode(e),{name:"PBKDF2"},!1,["deriveKey"]);return crypto.subtle.deriveKey({name:"PBKDF2",salt:V(t),iterations:15e4,hash:"SHA-256"},n,{name:"AES-GCM",length:256},!1,["encrypt","decrypt"])}async function he(s,t){const e=crypto.getRandomValues(new Uint8Array(12)),n=lt.encode(JSON.stringify(s)),r=await crypto.subtle.encrypt({name:"AES-GCM",iv:e},t,n);return{ciphertext:J(r),iv:J(e.buffer)}}async function me(s,t,e){const n=V(s),r=V(t),a=await crypto.subtle.decrypt({name:"AES-GCM",iv:r},e,n);return JSON.parse(de.decode(a))}const fe="finance-sync-db",ye=1,q="entries";function ge(){return new Promise((s,t)=>{const e=indexedDB.open(fe,ye);e.onupgradeneeded=n=>{const r=n.target.result;if(!r.objectStoreNames.contains(q)){const a=r.createObjectStore(q,{keyPath:"id"});a.createIndex("synced","synced",{unique:!1}),a.createIndex("updatedAt","updatedAt",{unique:!1})}},e.onsuccess=()=>s(e.result),e.onerror=()=>t(e.error)})}async function D(s,t){const e=await ge();return new Promise((n,r)=>{const a=e.transaction(q,s),o=a.objectStore(q);t(o,a,n,r),a.onerror=()=>r(a.error)})}async function ve(s){const t=Date.now(),e={id:s.id,type:s.type,amount:s.amount,createdAt:s.createdAt??t,updatedAt:s.updatedAt??t,synced:s.synced??!1,deleted:s.deleted??!1};return D("readwrite",(n,r,a)=>{n.put(e).onsuccess=()=>a(e)})}async function st(s,t){return D("readwrite",(e,n,r)=>{const a=e.get(s);a.onsuccess=()=>{const o=a.result;if(!o)return r();o.synced=!0,o.updatedAt=t??o.updatedAt,e.put(o).onsuccess=()=>r(o)}})}async function dt(s,t=Date.now()){return D("readwrite",(e,n,r)=>{const a=e.get(s);a.onsuccess=()=>{const i={...a.result||{id:s,createdAt:t},deleted:!0,synced:!1,updatedAt:t};e.put(i).onsuccess=()=>r(i)}})}async function ut(){return D("readonly",(s,t,e)=>{s.getAll().onsuccess=n=>e(n.target.result||[])})}async function be(){return D("readonly",(s,t,e)=>{const n=s.index("synced");n.getAll().onsuccess=r=>{const a=r.target.result||[];e(a.filter(o=>o&&o.synced===!1))}})}async function we(s){return D("readwrite",(t,e,n)=>{s.forEach(r=>t.put(r)),e.oncomplete=()=>n(s)})}async function Ae(){const s=await ut(),t=new Blob([JSON.stringify(s,null,2)],{type:"application/json"}),e=URL.createObjectURL(t),n=document.createElement("a");n.href=e,n.download="finance-backup.json",n.click(),URL.revokeObjectURL(e)}const Fe=3e3,Se="finance-sync";let B=null,ot=null;function Ce(s,t){return`${s}.${t}`}function Ee(s){const[t,e]=s.split(".");return{ciphertext:t,iv:e}}async function Ne(){const s=ct();if(!s)throw new Error("User not authenticated");return B||(B=await pe(s.uid)),{user:s,key:B}}function pt(s){return Rt(se,"users",s,"entries")}function Y(){clearTimeout(ot),ot=setTimeout(()=>O().catch(console.error),Fe)}async function Q(){Y()}async function $e(){window.addEventListener("online",()=>Y()),navigator.serviceWorker&&navigator.serviceWorker.addEventListener("message",s=>{var t;((t=s.data)==null?void 0:t.type)==="trigger-sync"&&Y()})}async function xe(s,t){const e=await be(),n=pt(s);for(const r of e){const a=It(n,r.id);if(r.deleted){await Pt(a),await st(r.id,r.updatedAt);continue}const{ciphertext:o,iv:i}=await he(r,t);await Bt(a,{encryptedData:Ce(o,i),updatedAt:r.updatedAt,serverUpdatedAt:qt()}),await st(r.id,r.updatedAt)}}async function Te(s,t){const e=pt(s),n=await Ot(e),r=[];if(n.forEach(d=>{const u=d.data();if(!u.encryptedData)return;const{ciphertext:p,iv:m}=Ee(u.encryptedData);r.push({id:d.id,payload:{ciphertext:p,iv:m},updatedAt:u.updatedAt})}),!r.length)return;const a=await ut(),o=new Map(a.map(d=>[d.id,d])),i=new Set(r.map(d=>d.id)),l=[];for(const d of r){const u=o.get(d.id);if(u&&u.updatedAt>=d.updatedAt){l.push(u);continue}const p=await me(d.payload.ciphertext,d.payload.iv,t);l.push({...p,synced:!0})}for(const d of a)d.synced&&!d.deleted&&!i.has(d.id)&&await dt(d.id,Date.now());await we(l)}async function O(){const{user:s,key:t}=await Ne();await xe(s.uid,t),await Te(s.uid,t)}function ht(){B=null}async function mt(){if("serviceWorker"in navigator&&"SyncManager"in window){const s=await navigator.serviceWorker.ready;try{await s.sync.register(Se)}catch(t){console.warn("Background sync registration failed",t)}}}const _={synced:"🟢 All changes synced",syncing:"🟡 Syncing…",offline:"🔴 Offline - changes queued"};let W=null,$=null,C=null,E=null;function N(s){$&&($.classList.remove("status-synced","status-syncing","status-offline"),s==="syncing"?($.textContent=_.syncing,$.classList.add("status-syncing")):s==="offline"?($.textContent=_.offline,$.classList.add("status-offline")):($.textContent=_.synced,$.classList.add("status-synced")))}function De(){N(navigator.onLine?"synced":"offline")}function Le(){C==null||C.addEventListener("click",async()=>{try{await ie(),await O(),N("synced")}catch(s){console.error("Login failed",s)}}),E==null||E.addEventListener("click",async()=>{try{await ce(),ht(),N("synced")}catch(s){console.error("Logout failed",s)}})}function ke(){window.addEventListener("online",()=>{N("syncing"),Q()}),window.addEventListener("offline",()=>N("offline"))}function Me(){le(async s=>{if(s){if(C==null||C.setAttribute("hidden","true"),E==null||E.removeAttribute("hidden"),ht(),N(navigator.onLine?"syncing":"offline"),navigator.onLine)try{await O(),N("synced")}catch(t){console.error("Auto-sync failed",t)}}else E==null||E.setAttribute("hidden","true"),C==null||C.removeAttribute("hidden"),N("synced")})}function Ie(){return crypto.randomUUID()}async function Pe(s){const t={id:s.id||Ie(),type:s.type,amount:s.amount,createdAt:s.createdAt||Date.now(),updatedAt:Date.now(),synced:!1,deleted:!1};return await ve(t),N(navigator.onLine?"syncing":"offline"),Q(),mt(),t}async function Be(s){await dt(s),N(navigator.onLine?"syncing":"offline"),Q(),mt()}async function qe(){await Ae()}async function Oe(){$=document.getElementById("syncStatus"),C=document.getElementById("loginBtn"),E=document.getElementById("logoutBtn"),W=new ne,await W.init(),window.app=W,Le(),ke(),Me(),await $e(),De(),window.syncAdapter={saveEntry:Pe,softDeleteEntry:Be,forceSync:O,exportLocalBackup:qe,getCurrentUser:ct}}window.addEventListener("DOMContentLoaded",()=>{Oe().catch(s=>console.error("Init failed",s))});
