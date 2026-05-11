import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle, Loader2, Plus, Trash2, UploadCloud } from "lucide-react";
import { doc, setDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";
import toast from "react-hot-toast";

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

export default function TemplateModal({ isOpen, onClose, template, onSave }) {
    const [activeTab, setActiveTab] = useState("general");
    const [loading, setLoading] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);

    const [formData, setFormData] = useState({});

    useEffect(() => {
        if (isOpen) {
            if (template) {
                const t = JSON.parse(JSON.stringify(template));
                // Deserialize nested arrays stored as JSON strings in Firestore
                t.materialRows  = typeof t.materialRows  === "string" ? JSON.parse(t.materialRows)  : (t.materialRows  || [["" ,"",""]]);
                t.financialRows = typeof t.financialRows === "string" ? JSON.parse(t.financialRows) : (t.financialRows || [["","","","",""]]);
                setFormData(t);
            } else {
                setFormData({
                    name: "", badge: "", projectTitle: "", projectName: "", intro: "",
                    introConfig: {
                        salutation: "Respected Sir,",
                        capacities: [{ kw: 3 }],
                        closing: "This proposal has been designed as per the detailed analysis of the site and is based on your electricity bill calculation and the space available.",
                        projectType: "Net-Metering based Rooftop PV Solar Power Plant"
                    },
                    diagramTitle: "", diagramImage: "", singleLineImage: "",
                    benefitsTitle: "Benefits", benefits: [""],
                    amountLabel: "", amountWords: "", delivery: "",
                    paymentTerms: [""], clientScope: [""],
                    materialRows:  [["", "", ""]],
                    financialRows: [["", "", "", "", ""]],
                    warranteePanels: "The solar modules are warranted by the solar panel manufacturer for a period of 25 years. Beginning on the Warranty Start Date and terminating on that date, which is one hundred and twenty (120) months thereafter, the warranty of modules and their respective DC connectors and cables, if any, shall be free from material defects in design, materials, and workmanship that affect the performance of the module and shall be covered under service warranty. (\"Limited Product Warranty\"). Material defects shall not include normal wear and tear.",
                    warranteePerformance: "80% efficiency up to 25 years",
                    warranteeInverter: "Inverter comes under complete 5 years of replacement warranty addition warranty can be add by Paying addition charges for the system.",
                    warranteeBos: "A standard 12-month warranty against manufacturing defects is provided. After the warranty period, this will ensure the supply of spares for the system at actual cost.",
                    warranteeNotes: [
                        "All warranty will start from the date of delivery",
                        "Test Report will be provided after completion",
                        "Performance report will be provided after 7 day of live working Site"
                    ],
                    warranteeImage: "",
                    howItWorksText1: "The solar panels convert sunlight into electric energy, which is Direct Current (DC). This current is sent to an inverter or controller as per the system design. The power is then converted or regulated for useful consumption at the customer site.",
                    howItWorksText2: "The generated power from the plant can fulfill the power requirement of the customer site during the daytime. The generated power is utilized, and surplus power is fed into the grid for later use.",
                    howItWorksText3: "All electrical components will be tested in accordance with manufacturer instructions and project requirements before handover."
                });
            }
            setActiveTab("general");
        }
    }, [isOpen, template]);

    if (!isOpen) return null;

    const handleUpload = async (file, field) => {
        if (!file) return;
        setUploadingImage(field);
        try {
            const data = new FormData();
            data.append("file", file);
            data.append("upload_preset", UPLOAD_PRESET);
            data.append("cloud_name", CLOUD_NAME);
            const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
                method: "POST",
                body: data,
            });
            const result = await res.json();
            if (result.secure_url) {
                setFormData(p => ({ ...p, [field]: result.secure_url }));
                toast.success("Image uploaded!");
            } else {
                throw new Error("Upload failed");
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to upload image");
        } finally {
            setUploadingImage(false);
        }
    };

    const handleArrayChange = (field, index, value) => {
        const newArray = [...(formData[field] || [])];
        newArray[index] = value;
        setFormData(p => ({ ...p, [field]: newArray }));
    };
    const addArrayItem = (field, defaultVal = "") => {
        setFormData(p => ({ ...p, [field]: [...(p[field] || []), defaultVal] }));
    };
    const removeArrayItem = (field, index) => {
        setFormData(p => ({ ...p, [field]: p[field].filter((_, i) => i !== index) }));
    };

    const handleNestedChange = (field, rowIndex, colIndex, value) => {
        const newRows = [...(formData[field] || [])];
        if (!newRows[rowIndex]) newRows[rowIndex] = [];
        newRows[rowIndex][colIndex] = value;
        setFormData(p => ({ ...p, [field]: newRows }));
    };
    const addNestedRow = (field, colCount) => {
        const emptyRow = Array(colCount).fill("");
        setFormData(p => ({ ...p, [field]: [...(p[field] || []), emptyRow] }));
    };
    const removeNestedRow = (field, rowIndex) => {
        setFormData(p => ({ ...p, [field]: p[field].filter((_, i) => i !== rowIndex) }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = {
                ...formData,
                // Firestore doesn't support nested arrays — serialize to JSON strings
                materialRows:  JSON.stringify(formData.materialRows  || []),
                financialRows: JSON.stringify(formData.financialRows || []),
                updatedAt: serverTimestamp()
            };

            if (formData.id) {
                await setDoc(doc(db, "quotationTemplates", formData.id), payload, { merge: true });
                toast.success("Template updated successfully");
            } else {
                payload.createdAt = serverTimestamp();
                await addDoc(collection(db, "quotationTemplates"), payload);
                toast.success("Template created successfully");
            }
            onSave();
            onClose();
        } catch (err) {
            console.error(err);
            toast.error("Failed to save template");
        } finally {
            setLoading(false);
        }
    };

    const tabs = [
        { id: "general",    label: "Page 1 · Cover" },
        { id: "intro",      label: "Page 2 · Intro" },
        { id: "howItWorks", label: "Page 3 · How It Works & Benefits" },
        { id: "tables",     label: "Page 4 · Materials & Financials" },
        { id: "roi",        label: "Page 5 · ROI & SIP" },
        { id: "warrantee",  label: "Page 6 · Warrantee" },
        { id: "scope",      label: "Page 7 · Scope" },
        { id: "terms",      label: "Page 8 · Terms" },
    ];

    // ── Intro helpers ─────────────────────────────────────────────
    const UNITS_PER_KW_PER_YEAR = 4 * 365; // 1460 units

    function getIntroConfig() {
        return formData.introConfig || {
            salutation: "Respected Sir,",
            capacities: [{ kw: 3 }],
            closing: "This proposal has been designed as per the detailed analysis of the site and is based on your electricity bill calculation and the space available.",
            projectType: "Net-Metering based Rooftop PV Solar Power Plant"
        };
    }

    function updateIntroConfig(field, value) {
        setFormData(p => ({ ...p, introConfig: { ...getIntroConfig(), [field]: value } }));
    }

    function addCapacity() {
        const cfg = getIntroConfig();
        updateIntroConfig("capacities", [...cfg.capacities, { kw: 1 }]);
    }

    function updateCapacity(i, kw) {
        const cfg = getIntroConfig();
        const updated = cfg.capacities.map((c, idx) => idx === i ? { kw: Number(kw) || 0 } : c);
        updateIntroConfig("capacities", updated);
    }

    function removeCapacity(i) {
        const cfg = getIntroConfig();
        updateIntroConfig("capacities", cfg.capacities.filter((_, idx) => idx !== i));
    }

    function buildIntroPreview(cfg) {
        if (!cfg || !cfg.capacities || cfg.capacities.length === 0) return "";
        const capParts = cfg.capacities.map(c => {
            const units = Math.round(c.kw * UNITS_PER_KW_PER_YEAR);
            return `(${c.kw} KW DC capacities to generate approx. ${units.toLocaleString("en-IN")} AC units respectively annually.)`;
        }).join(" ");
        return `We are delighted to present to you the quotation/proposal for a ${cfg.projectType || "Net-Metering based Rooftop PV Solar Power Plant"} of ${capParts} ${cfg.closing || ""}`;
    }

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" />
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col h-[90vh]">
                    
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">{formData.id ? "Edit Template" : "Create Template"}</h2>
                            <p className="text-sm text-slate-500">{formData.name || "New Template"}</p>
                        </div>
                        <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"><X size={20} /></button>
                    </div>

                    <div className="flex border-b border-slate-200 shrink-0 overflow-x-auto">
                        {tabs.map(tab => (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-6 py-3 text-sm font-semibold whitespace-nowrap transition-colors border-b-2 ${activeTab === tab.id ? "border-blue-500 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"}`}>
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
                        {activeTab === "general" && (
                            <div className="space-y-5">
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="block text-xs font-semibold text-slate-700 mb-1">Template Name (Internal)</label><input type="text" required value={formData.name || ""} onChange={e => setFormData(p => ({...p, name: e.target.value}))} className="w-full px-4 py-2 border rounded-lg text-sm" /></div>
                                    <div><label className="block text-xs font-semibold text-slate-700 mb-1">Badge (e.g. Popular)</label><input type="text" value={formData.badge || ""} onChange={e => setFormData(p => ({...p, badge: e.target.value}))} className="w-full px-4 py-2 border rounded-lg text-sm" /></div>
                                    <div><label className="block text-xs font-semibold text-slate-700 mb-1">Project Name (Short)</label><input type="text" required value={formData.projectName || ""} onChange={e => setFormData(p => ({...p, projectName: e.target.value}))} className="w-full px-4 py-2 border rounded-lg text-sm" /></div>
                                    <div><label className="block text-xs font-semibold text-slate-700 mb-1">Project Title (Full)</label><input type="text" required value={formData.projectTitle || ""} onChange={e => setFormData(p => ({...p, projectTitle: e.target.value}))} className="w-full px-4 py-2 border rounded-lg text-sm" /></div>
                                </div>
                        <div><label className="block text-xs font-semibold text-slate-700 mb-1">Introduction Text <span className="font-normal text-slate-400">(auto-generated — edit in "Intro / Page 2" tab)</span></label><textarea rows={2} readOnly value={buildIntroPreview(getIntroConfig())} className="w-full px-4 py-2 border rounded-lg text-sm bg-slate-50 text-slate-500 resize-none" /></div>
                            </div>
                        )}

                        {activeTab === "intro" && (() => {
                            const cfg = getIntroConfig();
                            const preview = buildIntroPreview(cfg);
                            return (
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">Salutation</label>
                                        <input type="text" value={cfg.salutation} onChange={e => updateIntroConfig("salutation", e.target.value)} className="w-full px-4 py-2 border rounded-lg text-sm" placeholder="e.g. Respected Sir," />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">Project Type Description</label>
                                        <input type="text" value={cfg.projectType || ""} onChange={e => updateIntroConfig("projectType", e.target.value)} className="w-full px-4 py-2 border rounded-lg text-sm" placeholder="e.g. Net-Metering based Rooftop PV Solar Power Plant" />
                                    </div>
                                    <div>
                                        <div className="flex items-center justify-between mb-3">
                                            <div>
                                                <label className="block text-sm font-bold text-slate-700">Solar Capacities</label>
                                                <p className="text-xs text-slate-400 mt-0.5">Formula: 1 KW × 4 units/day × 365 days = <strong>1,460 units/year</strong></p>
                                            </div>
                                            <button type="button" onClick={addCapacity} className="text-xs flex items-center gap-1 text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 font-semibold">
                                                <Plus size={12} /> Add Capacity
                                            </button>
                                        </div>
                                        <div className="space-y-2">
                                            {cfg.capacities.map((cap, i) => {
                                                const units = Math.round(cap.kw * UNITS_PER_KW_PER_YEAR);
                                                return (
                                                    <div key={i} className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3">
                                                        <div className="flex items-center gap-2 flex-1">
                                                            <input type="number" min="0.5" step="0.5" value={cap.kw} onChange={e => updateCapacity(i, e.target.value)} className="w-24 px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-mono text-center outline-none focus:border-blue-400" />
                                                            <span className="text-sm font-semibold text-slate-600">KW DC</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs text-slate-400">≈</span>
                                                            <span className="text-sm font-bold text-emerald-600">{units.toLocaleString("en-IN")}</span>
                                                            <span className="text-xs text-slate-400">AC units/year</span>
                                                        </div>
                                                        <button type="button" onClick={() => removeCapacity(i)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14} /></button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        {cfg.capacities.length === 0 && (
                                            <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-xl">
                                                <p className="text-sm text-slate-400">No capacities added. Click "+ Add Capacity".</p>
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">Closing Sentence</label>
                                        <textarea rows={3} value={cfg.closing || ""} onChange={e => updateIntroConfig("closing", e.target.value)} className="w-full px-4 py-2 border rounded-lg text-sm" placeholder="This proposal has been designed as per..." />
                                    </div>
                                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                                        <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-2">Live Preview — PDF Page 2</p>
                                        <p className="text-xs text-slate-500 mb-2 font-semibold">{cfg.salutation}</p>
                                        <p className="text-sm text-slate-700 leading-relaxed">{preview || <span className="italic text-slate-400">Preview will appear here...</span>}</p>
                                    </div>
                                </div>
                            );
                        })()}


                        {activeTab === "howItWorks" && (
                            <div className="space-y-5">
                                {/* ── How It Works ── */}
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-3">How It Works</label>
                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1">Paragraph 1 (System Operation)</label>
                                            <textarea rows={3} value={formData.howItWorksText1 || ""} onChange={e => setFormData(p => ({...p, howItWorksText1: e.target.value}))} className="w-full px-4 py-2 border rounded-lg text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1">Paragraph 2 (Power Utilization)</label>
                                            <textarea rows={3} value={formData.howItWorksText2 || ""} onChange={e => setFormData(p => ({...p, howItWorksText2: e.target.value}))} className="w-full px-4 py-2 border rounded-lg text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1">Paragraph 3 (Testing & Handover)</label>
                                            <textarea rows={2} value={formData.howItWorksText3 || ""} onChange={e => setFormData(p => ({...p, howItWorksText3: e.target.value}))} className="w-full px-4 py-2 border rounded-lg text-sm" />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Diagram Image <span className="text-xs font-normal text-slate-400">(appears on this page)</span></label>
                                    <input type="text" placeholder="Diagram Title" value={formData.diagramTitle || ""} onChange={e => setFormData(p => ({...p, diagramTitle: e.target.value}))} className="w-full px-4 py-2 border rounded-lg text-sm mb-3" />
                                    <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors relative h-40">
                                        {formData.diagramImage ? (
                                            <img src={formData.diagramImage} alt="Diagram" className="max-h-full max-w-full object-contain" />
                                        ) : (
                                            <><UploadCloud size={28} className="text-slate-400 mb-2" /><span className="text-sm text-slate-500 font-medium">Click to upload diagram</span></>
                                        )}
                                        <input type="file" accept="image/*" onChange={(e) => handleUpload(e.target.files[0], "diagramImage")} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                        {uploadingImage === "diagramImage" && <div className="absolute inset-0 bg-white/80 flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" /></div>}
                                    </div>
                                </div>

                                <hr className="border-slate-200" />

                                {/* ── Benefits ── */}
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-3">Benefits & Single Line Diagram</label>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">Single Line Diagram <span className="text-xs font-normal text-slate-400">(appears on this page)</span></label>
                                        <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors relative h-36">
                                            {formData.singleLineImage ? (
                                                <img src={formData.singleLineImage} alt="Single Line" className="max-h-full max-w-full object-contain" />
                                            ) : (
                                                <><UploadCloud size={28} className="text-slate-400 mb-2" /><span className="text-sm text-slate-500 font-medium">Click to upload single line diagram</span></>
                                            )}
                                            <input type="file" accept="image/*" onChange={(e) => handleUpload(e.target.files[0], "singleLineImage")} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                            {uploadingImage === "singleLineImage" && <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-xl"><Loader2 className="animate-spin text-blue-500" /></div>}
                                        </div>
                                    </div>
                                    <div className="mt-4">
                                        <div className="flex justify-between items-center mb-2">
                                            <label className="block text-sm font-bold text-slate-700">Benefits ({formData.benefitsTitle || "Benefits Title"})</label>
                                            <button type="button" onClick={() => addArrayItem("benefits")} className="text-xs flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-1 rounded hover:bg-blue-100"><Plus size={12}/> Add Item</button>
                                        </div>
                                        <input type="text" value={formData.benefitsTitle || ""} onChange={e => setFormData(p => ({...p, benefitsTitle: e.target.value}))} placeholder="Benefits Title" className="w-full px-4 py-2 border rounded-lg text-sm mb-2 font-semibold" />
                                        <div className="space-y-2">
                                            {(formData.benefits || []).map((item, i) => (
                                                <div key={i} className="flex gap-2">
                                                    <input type="text" value={item} onChange={e => handleArrayChange("benefits", i, e.target.value)} className="flex-1 px-3 py-1.5 border rounded-lg text-sm" />
                                                    <button type="button" onClick={() => removeArrayItem("benefits", i)} className="p-1.5 text-red-400 hover:text-red-600 bg-white rounded border border-slate-200"><Trash2 size={16}/></button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}


                        {activeTab === "warrantee" && (
                            <div className="space-y-5">
                                <div><label className="block text-xs font-semibold text-slate-700 mb-1">Panels Warranty</label><textarea rows={5} value={formData.warranteePanels || ""} onChange={e => setFormData(p => ({...p, warranteePanels: e.target.value}))} className="w-full px-4 py-2 border rounded-lg text-sm" /></div>
                                <div><label className="block text-xs font-semibold text-slate-700 mb-1">Performance Warranty</label><textarea rows={2} value={formData.warranteePerformance || ""} onChange={e => setFormData(p => ({...p, warranteePerformance: e.target.value}))} className="w-full px-4 py-2 border rounded-lg text-sm" /></div>
                                <div><label className="block text-xs font-semibold text-slate-700 mb-1">Inverter / Equipment</label><textarea rows={3} value={formData.warranteeInverter || ""} onChange={e => setFormData(p => ({...p, warranteeInverter: e.target.value}))} className="w-full px-4 py-2 border rounded-lg text-sm" /></div>
                                <div><label className="block text-xs font-semibold text-slate-700 mb-1">Balance of the Systems</label><textarea rows={3} value={formData.warranteeBos || ""} onChange={e => setFormData(p => ({...p, warranteeBos: e.target.value}))} className="w-full px-4 py-2 border rounded-lg text-sm" /></div>
                                
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="block text-sm font-bold text-slate-700">Warrantee Notes</label>
                                        <button type="button" onClick={() => addArrayItem("warranteeNotes")} className="text-xs flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-1 rounded hover:bg-blue-100"><Plus size={12}/> Add Note</button>
                                    </div>
                                    <div className="space-y-2">
                                        {(formData.warranteeNotes || []).map((item, i) => (
                                            <div key={i} className="flex gap-2">
                                                <input type="text" value={item} onChange={e => handleArrayChange("warranteeNotes", i, e.target.value)} className="flex-1 px-3 py-1.5 border rounded-lg text-sm" />
                                                <button type="button" onClick={() => removeArrayItem("warranteeNotes", i)} className="p-1.5 text-red-400 hover:text-red-600 bg-white rounded border border-slate-200"><Trash2 size={16}/></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Warrantee Page Image (Optional)</label>
                                    <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors relative h-40">
                                        {formData.warranteeImage ? (
                                            <img src={formData.warranteeImage} alt="Warrantee Image" className="max-h-full max-w-full object-contain" />
                                        ) : (
                                            <><UploadCloud size={32} className="text-slate-400 mb-2" /><span className="text-sm text-slate-500 font-medium">Click to upload warrantee diagram</span></>
                                        )}
                                        <input type="file" accept="image/*" onChange={(e) => handleUpload(e.target.files[0], "warranteeImage")} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                        {uploadingImage === "warranteeImage" && <div className="absolute inset-0 bg-white/80 flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" /></div>}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === "tables" && (
                            <div className="space-y-8">
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="block text-sm font-bold text-slate-700">Material Rows (Part | Make | Spec)</label>
                                        <button type="button" onClick={() => addNestedRow("materialRows", 3)} className="text-xs flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-1 rounded hover:bg-blue-100"><Plus size={12}/> Add Row</button>
                                    </div>
                                    <div className="space-y-2">
                                        {(formData.materialRows || []).map((row, rIdx) => (
                                            <div key={rIdx} className="flex gap-2 items-center">
                                                {[0, 1, 2].map(cIdx => (
                                                    <input key={cIdx} type="text" value={row[cIdx] || ""} onChange={(e) => handleNestedChange("materialRows", rIdx, cIdx, e.target.value)} className="flex-1 px-3 py-1.5 border rounded-lg text-sm" placeholder={`Column ${cIdx+1}`} />
                                                ))}
                                                <button type="button" onClick={() => removeNestedRow("materialRows", rIdx)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* ── Financial Rows with auto-calc ── */}
                                {(() => {
                                    // Helpers
                                    function toNum(v) { return parseFloat(String(v).replace(/,/g, "")) || 0; }

                                    function numberToWords(n) {
                                        if (!n || isNaN(n)) return "";
                                        const num = Math.round(n);
                                        const ones = ["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];
                                        const tens = ["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];
                                        function words(n) {
                                            if (n < 20) return ones[n];
                                            if (n < 100) return tens[Math.floor(n/10)] + (n%10 ? " " + ones[n%10] : "");
                                            if (n < 1000) return ones[Math.floor(n/100)] + " Hundred" + (n%100 ? " " + words(n%100) : "");
                                            if (n < 100000) return words(Math.floor(n/1000)) + " Thousand" + (n%1000 ? " " + words(n%1000) : "");
                                            if (n < 10000000) return words(Math.floor(n/100000)) + " Lakh" + (n%100000 ? " " + words(n%100000) : "");
                                            return words(Math.floor(n/10000000)) + " Crore" + (n%10000000 ? " " + words(n%10000000) : "");
                                        }
                                        return words(num) + " Rupees Only";
                                    }

                                    const rows = formData.financialRows || [];

                                    // Compute auto values for each row: Total = Rate, Final = Total - Disc
                                    const computedRows = rows.map(row => {
                                        const rate = toNum(row[1]);
                                        const disc = toNum(row[3]);
                                        const total = rate;
                                        const final_ = total - disc;
                                        return { desc: row[0] || "", rate, disc, total, final_ };
                                    });

                                    const grandTotal = computedRows.reduce((s, r) => s + r.final_, 0);
                                    const autoLabel  = grandTotal > 0 ? `Rs. ${grandTotal.toLocaleString("en-IN")}/-` : "";
                                    const autoWords  = numberToWords(grandTotal);

                                    function updateFinRow(rIdx, cIdx, val) {
                                        const updated = rows.map((r, i) => {
                                            if (i !== rIdx) return r;
                                            const copy = [...r];
                                            copy[cIdx] = val;
                                            // auto-fill Total (col2) = Rate (col1)
                                            const rate = toNum(cIdx === 1 ? val : copy[1]);
                                            const disc = toNum(cIdx === 3 ? val : copy[3]);
                                            copy[2] = rate > 0 ? rate.toLocaleString("en-IN") : copy[2];
                                            copy[4] = (rate - disc) > 0 ? (rate - disc).toLocaleString("en-IN") : "";
                                            return copy;
                                        });
                                        setFormData(p => ({ ...p, financialRows: updated }));
                                    }

                                    const COLS = [
                                        { label: "Description", flex: "flex-[3]", cIdx: 0, editable: true, type: "text" },
                                        { label: "Rate (₹)",    flex: "flex-[2]", cIdx: 1, editable: true, type: "number" },
                                        { label: "Total",       flex: "flex-[2]", cIdx: 2, editable: false },
                                        { label: "Discount",    flex: "flex-[2]", cIdx: 3, editable: true, type: "number" },
                                        { label: "Final (₹)",   flex: "flex-[2]", cIdx: 4, editable: false },
                                    ];

                                    return (
                                        <div>
                                            <div className="flex justify-between items-center mb-3">
                                                <div>
                                                    <label className="block text-sm font-bold text-slate-700">Financial Rows</label>
                                                    <p className="text-xs text-slate-400 mt-0.5">Total = Rate &nbsp;·&nbsp; Final = Total − Discount &nbsp;·&nbsp; Grand Total auto-calculated</p>
                                                </div>
                                                <button type="button" onClick={() => addNestedRow("financialRows", 5)} className="text-xs flex items-center gap-1 text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 font-semibold"><Plus size={12}/> Add Row</button>
                                            </div>

                                            {/* Header */}
                                            <div className="flex gap-2 mb-1 px-1">
                                                {COLS.map(c => <span key={c.cIdx} className={`${c.flex} text-[10px] font-bold text-slate-400 uppercase tracking-wide`}>{c.label}</span>)}
                                                <span className="w-8" />
                                            </div>

                                            {/* Rows */}
                                            <div className="space-y-2">
                                                {rows.length === 0 && (
                                                    <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-xl">
                                                        <p className="text-sm text-slate-400">No rows yet. Click "+ Add Row".</p>
                                                    </div>
                                                )}
                                                {rows.map((row, rIdx) => {
                                                    const r = computedRows[rIdx];
                                                    return (
                                                        <div key={rIdx} className="flex gap-2 items-center bg-white border border-slate-100 rounded-xl px-2 py-1.5">
                                                            {COLS.map(col => (
                                                                col.editable ? (
                                                                    <input
                                                                        key={col.cIdx}
                                                                        type={col.type}
                                                                        value={row[col.cIdx] || ""}
                                                                        onChange={e => updateFinRow(rIdx, col.cIdx, e.target.value)}
                                                                        className={`${col.flex} px-2 py-1.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-400`}
                                                                        placeholder={col.label}
                                                                    />
                                                                ) : (
                                                                    <div key={col.cIdx} className={`${col.flex} px-2 py-1.5 rounded-lg text-sm font-semibold ${col.cIdx === 4 ? "text-emerald-600 bg-emerald-50" : "text-slate-500 bg-slate-50"} text-right`}>
                                                                        {col.cIdx === 2 ? (r.total > 0 ? r.total.toLocaleString("en-IN") : "—") : (r.final_ >= 0 ? r.final_.toLocaleString("en-IN") : "—")}
                                                                    </div>
                                                                )
                                                            ))}
                                                            <button type="button" onClick={() => removeNestedRow("financialRows", rIdx)} className="w-8 h-8 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg shrink-0"><Trash2 size={15}/></button>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {/* Grand Total Bar */}
                                            {rows.length > 0 && (
                                                <div className="mt-3 flex justify-end">
                                                    <div className="bg-blue-600 text-white rounded-xl px-5 py-2.5 flex items-center gap-4">
                                                        <span className="text-xs font-semibold opacity-80">Grand Total</span>
                                                        <span className="text-lg font-bold">₹ {grandTotal.toLocaleString("en-IN")}</span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Amount fields — auto-filled but overridable */}
                                            <div className="grid grid-cols-2 gap-4 mt-4">
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Amount Label <span className="font-normal text-slate-400">(auto-filled)</span></label>
                                                    <input
                                                        type="text"
                                                        value={formData.amountLabel || autoLabel}
                                                        onChange={e => setFormData(p => ({...p, amountLabel: e.target.value}))}
                                                        placeholder={autoLabel || "e.g. Rs. 1,20,000/-"}
                                                        className="w-full px-4 py-2 border rounded-lg text-sm"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Amount in Words <span className="font-normal text-slate-400">(auto-filled)</span></label>
                                                    <input
                                                        type="text"
                                                        value={formData.amountWords || autoWords}
                                                        onChange={e => setFormData(p => ({...p, amountWords: e.target.value}))}
                                                        placeholder={autoWords || "e.g. One Lakh Twenty Thousand Rupees Only"}
                                                        className="w-full px-4 py-2 border rounded-lg text-sm"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        )}

                        {activeTab === "roi" && (() => {
                            function toNum(v) { return parseFloat(String(v || "").replace(/,/g, "")) || 0; }
                            const rows = formData.financialRows || [];
                            const quotedAmount  = rows.reduce((s, r) => { const rt = toNum(r[1]); const d = toNum(r[3]); return s + (rt - d); }, 0);
                            const govtSubsidy   = toNum(formData.govtSubsidy);
                            const actualInvest  = Math.max(0, quotedAmount - govtSubsidy);
                            const monthlyBill   = toNum(formData.monthlyBill);
                            const annualSavings = monthlyBill * 12;
                            const paybackYears  = annualSavings > 0 ? actualInvest / annualSavings : 0;
                            const pwY = Math.floor(paybackYears);
                            const pwM = Math.round((paybackYears - pwY) * 12);
                            const total25 = annualSavings * 25;
                            const systemInfo = formData.name || formData.projectName || "Solar Power System";
                            const fmt = n => Math.round(n).toLocaleString("en-IN");
                            function toLakhs(n) {
                                if (n >= 10000000) return `₹${(n/10000000).toFixed(1)} Crore`;
                                if (n >= 100000) return `₹${(n/100000).toFixed(1)} Lakhs`;
                                return `₹${fmt(n)}`;
                            }

                            return (
                                <div className="space-y-5">
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-800">ROI & SIP Analysis</h3>
                                        <p className="text-xs text-slate-400 mt-0.5">Professional client-facing summary · Auto-calculated from financials</p>
                                    </div>

                                    {/* Inputs */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                                            <label className="block text-xs font-bold text-amber-800 mb-1.5">📋 Monthly Electricity Bill (₹)</label>
                                            <input type="number" min="0" value={formData.monthlyBill || ""} onChange={e => setFormData(p => ({ ...p, monthlyBill: e.target.value }))} placeholder="e.g. 4000" className="w-full text-sm font-bold border border-amber-300 rounded-lg px-3 py-2 outline-none focus:border-amber-500 bg-white" />
                                        </div>
                                        <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                                            <label className="block text-xs font-bold text-green-800 mb-1.5">🏛️ Govt. Subsidy Amount (₹)</label>
                                            <input type="number" min="0" value={formData.govtSubsidy || ""} onChange={e => setFormData(p => ({ ...p, govtSubsidy: e.target.value }))} placeholder="e.g. 78000" className="w-full text-sm font-bold border border-green-300 rounded-lg px-3 py-2 outline-none focus:border-green-500 bg-white" />
                                        </div>
                                    </div>

                                    {/* Professional Summary Table */}
                                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="bg-blue-600 text-white text-xs">
                                                    {["System Info","Monthly Bill","Quoted Amount","Govt. Subsidy","Actual Investment","Estimated ROI"].map(h => (
                                                        <th key={h} className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr className="bg-slate-50">
                                                    <td className="px-3 py-3 font-semibold text-slate-800 whitespace-nowrap">{systemInfo}</td>
                                                    <td className="px-3 py-3 text-blue-700 font-bold">{monthlyBill > 0 ? `₹${fmt(monthlyBill)}/month` : "—"}</td>
                                                    <td className="px-3 py-3 text-slate-700 font-semibold">{quotedAmount > 0 ? `₹${fmt(quotedAmount)}` : "—"}</td>
                                                    <td className="px-3 py-3 text-emerald-700 font-bold">{govtSubsidy > 0 ? `₹${fmt(govtSubsidy)}` : "—"}</td>
                                                    <td className="px-3 py-3 text-orange-700 font-bold">{actualInvest > 0 ? `₹${fmt(actualInvest)}` : "—"}</td>
                                                    <td className="px-3 py-3 font-bold text-blue-700">{annualSavings > 0 && actualInvest > 0 ? `${pwY} Yr${pwY !== 1 ? "s" : ""} ${pwM} Mo` : "—"}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>

                                    {monthlyBill > 0 && actualInvest > 0 && (
                                        <div className="space-y-3">
                                            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                                                <p className="text-xs font-bold text-blue-800 mb-1.5">📊 Professional Savings Summary</p>
                                                <p className="text-sm text-slate-700 leading-relaxed">
                                                    After approximately <strong>{pwY} Year{pwY !== 1 ? "s" : ""} {pwM} Month{pwM !== 1 ? "s" : ""}</strong>, your solar system can recover its installation cost and start generating estimated savings of around <strong>₹{fmt(monthlyBill)} per month</strong> for the remaining lifespan of the system.
                                                </p>
                                                <p className="text-sm text-slate-700 leading-relaxed mt-2">
                                                    Over 25 years, this may result in an estimated direct electricity bill saving of approximately <strong>{toLakhs(total25)}</strong>.*
                                                </p>
                                            </div>
                                            <div className="bg-purple-50 border border-purple-100 rounded-xl px-4 py-3">
                                                <p className="text-xs font-bold text-purple-800 mb-1">📈 Investment Comparison</p>
                                                <p className="text-sm text-slate-600 leading-relaxed italic">
                                                    If the equivalent monthly savings are invested through SIPs with an assumed average annual return of 12%, the long-term value may become significantly higher over 25 years.*
                                                </p>
                                            </div>
                                            <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5">
                                                <p className="text-[11px] text-slate-500 leading-relaxed">
                                                    * Savings are estimated values based on current electricity tariffs, sunlight conditions, and system performance. Actual results may vary.
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })()}

                        {activeTab === "scope" && (
                            <div className="space-y-4">
                                <p className="text-xs text-slate-400">Client responsibilities listed on Page 7 of the PDF.</p>
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="block text-sm font-bold text-slate-700">Client Scope</label>
                                        <button type="button" onClick={() => addArrayItem("clientScope")} className="text-xs flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-1 rounded hover:bg-blue-100"><Plus size={12}/> Add Item</button>
                                    </div>
                                    <div className="space-y-2">
                                        {(formData.clientScope || []).map((item, i) => (
                                            <div key={i} className="flex gap-2">
                                                <input type="text" value={item} onChange={e => handleArrayChange("clientScope", i, e.target.value)} className="flex-1 px-3 py-1.5 border rounded-lg text-sm" />
                                                <button type="button" onClick={() => removeArrayItem("clientScope", i)} className="p-1.5 text-red-400 hover:text-red-600 bg-white rounded border border-slate-200"><Trash2 size={16}/></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === "terms" && (
                            <div className="space-y-6">
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="block text-sm font-bold text-slate-700">Payment Terms</label>
                                        <button type="button" onClick={() => addArrayItem("paymentTerms")} className="text-xs flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-1 rounded hover:bg-blue-100"><Plus size={12}/> Add Item</button>
                                    </div>
                                    <div className="space-y-2">
                                        {(formData.paymentTerms || []).map((item, i) => (
                                            <div key={i} className="flex gap-2">
                                                <input type="text" value={item} onChange={e => handleArrayChange("paymentTerms", i, e.target.value)} className="flex-1 px-3 py-1.5 border rounded-lg text-sm" />
                                                <button type="button" onClick={() => removeArrayItem("paymentTerms", i)} className="p-1.5 text-red-400 hover:text-red-600 bg-white rounded border border-slate-200"><Trash2 size={16}/></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div><label className="block text-xs font-semibold text-slate-700 mb-1">Delivery Info</label><input type="text" value={formData.delivery || ""} onChange={e => setFormData(p => ({...p, delivery: e.target.value}))} className="w-full px-4 py-2 border rounded-lg text-sm" /></div>
                            </div>
                        )}

                        <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-slate-200">
                            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-100 transition-colors">Cancel</button>
                            <button type="submit" disabled={loading} className="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition-all flex items-center gap-2 disabled:opacity-70">
                                {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                                {formData.id ? "Save Changes" : "Create Template"}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
