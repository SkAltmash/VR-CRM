import { useEffect, useMemo, useState } from "react";
import { X, Download, MessageCircle, Loader2, FileText, Plus, Minus, Eye, Edit, Zap, UploadCloud, CheckCircle2 } from "lucide-react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../../firebase";
import { createQuotationFile, createQuotationPreviewUrl, downloadQuotationPdf } from "../utils/quotationPdf";
import toast from "react-hot-toast";

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

// Map template name/badge to a cover image
const QUOTATION_IMAGES = [
    { keywords: ["hybrid"], img: "/Quotation/Hybrid-Solar-System.png" },
    { keywords: ["off-grid", "off grid", "offgrid"], img: "/Quotation/Off-Grid.png" },
    { keywords: ["on-grid", "on grid", "ongrid", "drawing"], img: "/Quotation/On Grid Drawing.png" },
    { keywords: ["pump", "water pump", "solar pump"], img: "/Quotation/Solar Pump.jpg.jpeg" },
    { keywords: ["heater", "water heater", "solar water"], img: "/Quotation/Solar Water heater.png" },
    { keywords: ["street", "street light"], img: "/Quotation/solar street light.jpg.jpeg" },
    { keywords: ["single line", "diagram"], img: "/Quotation/Single Line Diagram.png" },
    { keywords: ["setup"], img: "/Quotation/Setup.png" },
];

function getTemplateImage(template) {
    const haystack = `${template.name} ${template.badge} ${template.projectName}`.toLowerCase();
    for (const entry of QUOTATION_IMAGES) {
        if (entry.keywords.some(k => haystack.includes(k))) return entry.img;
    }
    return "/Quotation/Setup.png";
}

export default function QuotationPreviewModal({ isOpen, lead, onClose, onActivity }) {
    const [templates, setTemplates] = useState([]);
    const [fetching, setFetching] = useState(true);
    const [selectedTypeId, setSelectedTypeId] = useState(null);
    const [previewUrl, setPreviewUrl] = useState("");
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewError, setPreviewError] = useState("");
    const [action, setAction] = useState(null);
    const [activeTab, setActiveTab] = useState("form");
    const [formTab, setFormTab] = useState("details");
    const [uploadingImage, setUploadingImage] = useState(false);

    const FORM_TABS = [
        { id: "details", label: "General" },
        { id: "howItWorks", label: "How It Works" },
        { id: "images", label: "Images" },
        { id: "warrantee", label: "Warrantee Details" },
        { id: "specification", label: "Materials & Financials" },
        { id: "financials", label: "Financials" },
        { id: "scope", label: "Benefits & Terms" },
        { id: "terms", label: "Terms & Delivery" },
    ];

    const selectedType = useMemo(
        () => templates.find((type) => type.id === selectedTypeId) || templates[0] || {},
        [selectedTypeId, templates]
    );

    const [formData, setFormData] = useState({});

    useEffect(() => {
        if (!isOpen) return;
        let isMounted = true;
        setFetching(true);
        getDocs(query(collection(db, "quotationTemplates"), orderBy("createdAt", "desc")))
            .then(snap => {
                if (!isMounted) return;
                const data = snap.docs.map(d => {
                    const docData = d.data();
                    return {
                        ...docData,
                        id: d.id,
                        materialRows: typeof docData.materialRows === 'string' ? JSON.parse(docData.materialRows) : (docData.materialRows || []),
                        financialRows: typeof docData.financialRows === 'string' ? JSON.parse(docData.financialRows) : (docData.financialRows || [])
                    };
                });
                setTemplates(data);
                if (data.length > 0 && (!selectedTypeId || !data.find(d => d.id === selectedTypeId))) {
                    setSelectedTypeId(data[0].id);
                }
            })
            .catch(err => {
                console.error(err);
                if (isMounted) toast.error("Failed to load templates");
            })
            .finally(() => {
                if (isMounted) setFetching(false);
            });

        return () => { isMounted = false; };
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) {
            setSelectedTypeId(null);
            setActiveTab("form");
            setFormTab("details");
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && lead && selectedType && Object.keys(selectedType).length > 0) {
            setFormData(JSON.parse(JSON.stringify(selectedType)));
        }
    }, [isOpen, lead, selectedType]);

    // Whenever formData or activeTab changes to preview, regenerate preview
    useEffect(() => {
        if (!isOpen || !lead || activeTab !== "preview" || !formData.id) return;

        let cancelled = false;
        setPreviewLoading(true);
        setPreviewError("");
        setPreviewUrl("");

        createQuotationPreviewUrl(lead, formData)
            .then((url) => {
                if (cancelled) {
                    URL.revokeObjectURL(url);
                    return;
                }
                setPreviewUrl(url);
            })
            .catch((err) => {
                console.error("Failed to create quotation preview:", err);
                if (!cancelled) setPreviewError("Preview unavailable");
            })
            .finally(() => {
                if (!cancelled) setPreviewLoading(false);
            });

        return () => { cancelled = true; };
    }, [isOpen, lead, formData, activeTab]);

    useEffect(() => {
        return () => {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
        };
    }, [previewUrl]);

    if (!isOpen || !lead) return null;

    async function handleDownload() {
        setAction("download");
        try {
            const type = await downloadQuotationPdf(lead, formData);
            await onActivity?.(`Quotation PDF downloaded - ${type.name}`, "quotation");
        } catch (err) {
            console.error("Failed to download quotation:", err);
            toast.error("Failed to download quotation PDF. Please try again.");
        } finally {
            setAction(null);
        }
    }

    async function handleWhatsApp() {
        setAction("whatsapp");

        const number = lead?.phone ? lead.phone.replace(/\D/g, "") : "";

        // Copy to clipboard if available
        if (number) {
            try {
                await navigator.clipboard.writeText(number);
            } catch (e) {
                console.warn("Could not copy to clipboard", e);
            }
        }

        try {
            const { file } = await createQuotationFile(lead, formData);

            // Attempt to use Web Share API (auto-attaches the file on supported devices)
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                try {
                    await navigator.share({
                        title: "Quotation",
                        files: [file]
                    });
                    return; // Successfully shared, we can return early
                } catch (shareErr) {
                    console.log("Share failed or user cancelled, falling back...", shareErr);
                }
            }

            // Fallback: Download file and open WhatsApp Web directly to the chat
            const pdfUrl = URL.createObjectURL(file);
            const link = document.createElement("a");
            link.href = pdfUrl;
            link.download = file.name || "quotation.pdf";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            let waUrl = "https://web.whatsapp.com/";
            if (number) {
                const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
                if (isMobile) {
                    waUrl = `https://api.whatsapp.com/send?phone=${number}`;
                } else {
                    waUrl = `https://web.whatsapp.com/send?phone=${number}`;
                }
            }
            window.open(waUrl, "_blank");

            setTimeout(() => {
                URL.revokeObjectURL(pdfUrl);
            }, 3000);
        } catch (err) {
            console.error(err);
            if (err?.name !== "AbortError") {
                toast.error("Failed to prepare quotation PDF.");
            }
        } finally {
            setAction(null);
        }
    }

    const handleFormChange = (e, field) => {
        setFormData({ ...formData, [field]: e.target.value });
    };

    const updateArrayRow = (arrayName, rowIndex, colIndex, value) => {
        const newArray = [...formData[arrayName]];
        if (colIndex !== null) {
            newArray[rowIndex][colIndex] = value;
        } else {
            newArray[rowIndex] = value;
        }
        setFormData({ ...formData, [arrayName]: newArray });
    };

    const addArrayRow = (arrayName, template) => {
        setFormData({ ...formData, [arrayName]: [...formData[arrayName], template] });
    };

    const removeArrayRow = (arrayName, rowIndex) => {
        const newArray = [...formData[arrayName]];
        newArray.splice(rowIndex, 1);
        setFormData({ ...formData, [arrayName]: newArray });
    };

    const handleUpload = async (file, field) => {
        if (!file) return;
        setUploadingImage(field);
        try {
            const data = new FormData();
            data.append("file", file);
            data.append("upload_preset", UPLOAD_PRESET);
            data.append("cloud_name", CLOUD_NAME);
            const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: "POST", body: data });
            const result = await res.json();
            if (result.secure_url) {
                setFormData(p => ({ ...p, [field]: result.secure_url }));
                toast.success("Image uploaded!");
            } else throw new Error("Upload failed");
        } catch (err) {
            console.error(err);
            toast.error("Failed to upload image");
        } finally {
            setUploadingImage(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
                {/* ── Header ── */}
                <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-100 bg-white shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-blue-500/30">
                            <Zap size={16} />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-sm font-bold text-slate-800">Quotation Generator</h2>
                            <p className="text-xs text-slate-400 truncate max-w-[220px]">{lead.name} · {lead.phone || "No phone"}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex bg-slate-100 p-0.5 rounded-lg gap-0.5">
                            <button onClick={() => setActiveTab("form")} className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === "form" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700 bg-transparent border-none"}`}>
                                <Edit size={12} /> Edit
                            </button>
                            <button onClick={() => setActiveTab("preview")} className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === "preview" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700 bg-transparent border-none"}`}>
                                <Eye size={12} /> Preview
                            </button>
                        </div>
                        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 border-none bg-transparent cursor-pointer transition-all">
                            <X size={18} />
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-[180px_1fr] max-lg:grid-cols-1 flex-1 min-h-0">
                    {/* ── Template Sidebar ── */}
                    <aside className="border-r border-slate-100 max-lg:border-r-0 max-lg:border-b max-lg:max-h-48 overflow-y-auto p-3 bg-slate-50">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Templates</p>
                        {fetching ? (
                            <div className="flex justify-center py-6"><Loader2 size={18} className="animate-spin text-blue-400" /></div>
                        ) : templates.length === 0 ? (
                            <div className="text-xs text-slate-400 text-center py-4 px-1">No templates found.</div>
                        ) : (
                            <div className="flex flex-col gap-1.5">
                                {templates.map((type) => {
                                    const img = getTemplateImage(type);
                                    const isSelected = selectedTypeId === type.id;
                                    return (
                                        <button key={type.id} type="button" onClick={() => setSelectedTypeId(type.id)}
                                            className={`flex items-center gap-2.5 w-full text-left rounded-lg px-2 py-1.5 cursor-pointer transition-all duration-150 ${isSelected
                                                    ? "bg-blue-50 ring-1 ring-blue-400"
                                                    : "hover:bg-slate-100"
                                                }`}
                                        >

                                            {/* Info */}
                                            <div className="min-w-0">
                                                <p className={`text-xs font-semibold leading-tight truncate ${isSelected ? "text-blue-700" : "text-slate-700"}`}>{type.name}</p>
                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full mt-0.5 inline-block ${isSelected ? "bg-blue-100 text-blue-600" : "bg-slate-200 text-slate-500"
                                                    }`}>{type.badge || "Template"}</span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </aside>

                    {/* ── Main Content ── */}
                    <section className="min-h-0 flex flex-col bg-slate-50/50">
                        {activeTab === "form" ? (
                            <div className="flex-1 flex flex-col min-h-0">
                                {/* Sub-tab bar */}
                                <div className="border-b border-slate-100 bg-white px-5 flex gap-1 overflow-x-auto shrink-0">
                                    {FORM_TABS.map((tab) => (
                                        <button key={tab.id} onClick={() => setFormTab(tab.id)}
                                            className={`whitespace-nowrap px-3 py-3 text-[13px] font-semibold border-b-2 transition-all ${formTab === tab.id ? "border-blue-500 text-blue-600" : "border-transparent text-slate-400 hover:text-slate-600"
                                                }`}
                                        >{tab.label}</button>
                                    ))}
                                </div>
                                <div className="flex-1 overflow-y-auto p-5">
                                    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                                        {formTab === "details" && (
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="col-span-2"><h3 className="font-semibold text-slate-800 mb-2 border-b pb-2">Project Information</h3></div>
                                                <div>
                                                    <label className="block text-xs text-slate-500 mb-1">Project Title</label>
                                                    <input type="text" value={formData.projectTitle || ""} onChange={(e) => handleFormChange(e, "projectTitle")} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-slate-500 mb-1">Project Name</label>
                                                    <input type="text" value={formData.projectName || ""} onChange={(e) => handleFormChange(e, "projectName")} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500" />
                                                </div>
                                                <div className="col-span-2">
                                                    <label className="block text-xs text-slate-500 mb-1">Introduction</label>
                                                    <textarea value={formData.intro || ""} onChange={(e) => handleFormChange(e, "intro")} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500 min-h-[80px]" />
                                                </div>

                                                <div className="col-span-2 mt-4"><h3 className="font-semibold text-slate-800 mb-2 border-b pb-2">Benefits</h3></div>
                                                <div>
                                                    <label className="block text-xs text-slate-500 mb-1">Benefits Title</label>
                                                    <input type="text" value={formData.benefitsTitle || ""} onChange={(e) => handleFormChange(e, "benefitsTitle")} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500" />
                                                </div>
                                                <div className="col-span-2 flex flex-col gap-2">
                                                    {formData.benefits?.map((benefit, i) => (
                                                        <div key={i} className="flex gap-2">
                                                            <input type="text" value={benefit} onChange={(e) => updateArrayRow("benefits", i, null, e.target.value)} className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500" />
                                                            <button onClick={() => removeArrayRow("benefits", i)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Minus size={16} /></button>
                                                        </div>
                                                    ))}
                                                    <button onClick={() => addArrayRow("benefits", "")} className="self-start flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium px-2 py-1"><Plus size={16} /> Add Benefit</button>
                                                </div>
                                            </div>
                                        )}

                                        {formTab === "howItWorks" && (
                                            <div className="flex flex-col gap-4">
                                                <h3 className="font-semibold text-slate-800 mb-2 border-b pb-2">How It Works</h3>
                                                <div>
                                                    <label className="block text-xs text-slate-500 mb-1">Paragraph 1 (System Operation)</label>
                                                    <textarea value={formData.howItWorksText1 || ""} onChange={(e) => handleFormChange(e, "howItWorksText1")} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500 min-h-[80px]" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-slate-500 mb-1">Paragraph 2 (Power Utilization)</label>
                                                    <textarea value={formData.howItWorksText2 || ""} onChange={(e) => handleFormChange(e, "howItWorksText2")} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500 min-h-[80px]" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-slate-500 mb-1">Paragraph 3 (Testing & Handover)</label>
                                                    <textarea value={formData.howItWorksText3 || ""} onChange={(e) => handleFormChange(e, "howItWorksText3")} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500 min-h-[60px]" />
                                                </div>
                                            </div>
                                        )}

                                        {formTab === "images" && (
                                            <div className="grid grid-cols-2 gap-8">
                                                <div>
                                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Diagram Image</label>
                                                    <input type="text" placeholder="Diagram Title" value={formData.diagramTitle || ""} onChange={(e) => handleFormChange(e, "diagramTitle")} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500 mb-3" />
                                                    <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors relative h-44">
                                                        {formData.diagramImage ? (
                                                            <img src={formData.diagramImage} alt="Diagram" className="max-h-full max-w-full object-contain" />
                                                        ) : (
                                                            <><UploadCloud size={28} className="text-slate-400 mb-2" /><span className="text-sm text-slate-500">Click to upload diagram</span></>
                                                        )}
                                                        <input type="file" accept="image/*" onChange={(e) => handleUpload(e.target.files[0], "diagramImage")} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                                        {uploadingImage === "diagramImage" && <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-xl"><Loader2 className="animate-spin text-blue-500" /></div>}
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Single Line Diagram</label>
                                                    <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors relative h-[244px] mt-0.5">
                                                        {formData.singleLineImage ? (
                                                            <img src={formData.singleLineImage} alt="Single Line" className="max-h-full max-w-full object-contain" />
                                                        ) : (
                                                            <><UploadCloud size={28} className="text-slate-400 mb-2" /><span className="text-sm text-slate-500">Click to upload single line diagram</span></>
                                                        )}
                                                        <input type="file" accept="image/*" onChange={(e) => handleUpload(e.target.files[0], "singleLineImage")} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                                        {uploadingImage === "singleLineImage" && <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-xl"><Loader2 className="animate-spin text-blue-500" /></div>}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {formTab === "warrantee" && (
                                            <div className="flex flex-col gap-4">
                                                <h3 className="font-semibold text-slate-800 mb-2 border-b pb-2">Warrantee Details</h3>
                                                <div>
                                                    <label className="block text-xs text-slate-500 mb-1">Panels Warranty</label>
                                                    <textarea value={formData.warranteePanels || ""} onChange={(e) => handleFormChange(e, "warranteePanels")} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500 min-h-[100px]" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-slate-500 mb-1">Performance Warranty</label>
                                                    <textarea value={formData.warranteePerformance || ""} onChange={(e) => handleFormChange(e, "warranteePerformance")} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500 min-h-[60px]" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-slate-500 mb-1">Inverter / Equipment</label>
                                                    <textarea value={formData.warranteeInverter || ""} onChange={(e) => handleFormChange(e, "warranteeInverter")} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500 min-h-[60px]" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-slate-500 mb-1">Balance of Systems (BOS)</label>
                                                    <textarea value={formData.warranteeBos || ""} onChange={(e) => handleFormChange(e, "warranteeBos")} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500 min-h-[60px]" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-slate-500 mb-1 font-semibold">Warrantee Notes</label>
                                                    {formData.warranteeNotes?.map((note, i) => (
                                                        <div key={i} className="flex gap-2 mb-2">
                                                            <input type="text" value={note} onChange={(e) => updateArrayRow("warranteeNotes", i, null, e.target.value)} className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500" />
                                                            <button onClick={() => removeArrayRow("warranteeNotes", i)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Minus size={16} /></button>
                                                        </div>
                                                    ))}
                                                    <button onClick={() => addArrayRow("warranteeNotes", "")} className="self-start flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium px-2 py-1"><Plus size={16} /> Add Note</button>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Warrantee Page Image (Optional)</label>
                                                    <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors relative h-36">
                                                        {formData.warranteeImage ? (
                                                            <img src={formData.warranteeImage} alt="Warrantee" className="max-h-full max-w-full object-contain" />
                                                        ) : (
                                                            <><UploadCloud size={28} className="text-slate-400 mb-2" /><span className="text-sm text-slate-500">Click to upload warrantee image</span></>
                                                        )}
                                                        <input type="file" accept="image/*" onChange={(e) => handleUpload(e.target.files[0], "warranteeImage")} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                                        {uploadingImage === "warranteeImage" && <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-xl"><Loader2 className="animate-spin text-blue-500" /></div>}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {formTab === "specification" && (
                                            <div className="flex flex-col gap-4">
                                                <div className="grid grid-cols-[1fr_1fr_1.5fr_auto] gap-3 mb-2 px-2">
                                                    <div className="text-xs font-semibold text-slate-500">Parts / Material</div>
                                                    <div className="text-xs font-semibold text-slate-500">Make</div>
                                                    <div className="text-xs font-semibold text-slate-500">Specification</div>
                                                    <div className="w-8"></div>
                                                </div>
                                                {formData.materialRows?.map((row, i) => (
                                                    <div key={i} className="grid grid-cols-[1fr_1fr_1.5fr_auto] gap-3 items-start">
                                                        <textarea value={row[0]} onChange={(e) => updateArrayRow("materialRows", i, 0, e.target.value)} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500 min-h-[60px]" />
                                                        <textarea value={row[1]} onChange={(e) => updateArrayRow("materialRows", i, 1, e.target.value)} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500 min-h-[60px]" />
                                                        <textarea value={row[2]} onChange={(e) => updateArrayRow("materialRows", i, 2, e.target.value)} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500 min-h-[60px]" />
                                                        <button onClick={() => removeArrayRow("materialRows", i)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg mt-1"><Minus size={18} /></button>
                                                    </div>
                                                ))}
                                                <button onClick={() => addArrayRow("materialRows", ["", "", ""])} className="self-start flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium px-2 py-1 bg-blue-50 rounded-lg mt-2"><Plus size={16} /> Add Material Row</button>
                                            </div>
                                        )}

                                        {formTab === "financials" && (
                                            <div className="flex flex-col gap-4">
                                                <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-3 mb-2 px-2">
                                                    <div className="text-xs font-semibold text-slate-500">Description</div>
                                                    <div className="text-xs font-semibold text-slate-500">Rate</div>
                                                    <div className="text-xs font-semibold text-slate-500">Total</div>
                                                    <div className="text-xs font-semibold text-slate-500">Discount</div>
                                                    <div className="text-xs font-semibold text-slate-500">Net Total</div>
                                                    <div className="w-8"></div>
                                                </div>
                                                {formData.financialRows?.map((row, i) => (
                                                    <div key={i} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-3 items-start">
                                                        <input type="text" value={row[0]} onChange={(e) => updateArrayRow("financialRows", i, 0, e.target.value)} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500" />
                                                        <input type="text" value={row[1]} onChange={(e) => updateArrayRow("financialRows", i, 1, e.target.value)} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500" />
                                                        <input type="text" value={row[2]} onChange={(e) => updateArrayRow("financialRows", i, 2, e.target.value)} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500" />
                                                        <input type="text" value={row[3]} onChange={(e) => updateArrayRow("financialRows", i, 3, e.target.value)} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500" />
                                                        <input type="text" value={row[4]} onChange={(e) => updateArrayRow("financialRows", i, 4, e.target.value)} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500" />
                                                        <button onClick={() => removeArrayRow("financialRows", i)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Minus size={18} /></button>
                                                    </div>
                                                ))}
                                                <button onClick={() => addArrayRow("financialRows", ["", "", "", "", ""])} className="self-start flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium px-2 py-1 bg-blue-50 rounded-lg mt-2"><Plus size={16} /> Add Row</button>

                                                <div className="mt-6 border-t pt-4 grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-xs text-slate-500 mb-1">Amount Label (Total)</label>
                                                        <input type="text" value={formData.amountLabel || ""} onChange={(e) => handleFormChange(e, "amountLabel")} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500 font-bold" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs text-slate-500 mb-1">Amount In Words</label>
                                                        <input type="text" value={formData.amountWords || ""} onChange={(e) => handleFormChange(e, "amountWords")} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500" />
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {formTab === "scope" && (
                                            <div className="flex flex-col gap-4">
                                                <h3 className="font-semibold text-slate-800 mb-2 border-b pb-2">Client Scope</h3>
                                                {formData.clientScope?.map((scope, i) => (
                                                    <div key={i} className="flex gap-2">
                                                        <input type="text" value={scope} onChange={(e) => updateArrayRow("clientScope", i, null, e.target.value)} className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500" />
                                                        <button onClick={() => removeArrayRow("clientScope", i)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Minus size={18} /></button>
                                                    </div>
                                                ))}
                                                <button onClick={() => addArrayRow("clientScope", "")} className="self-start flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium px-2 py-1 bg-blue-50 rounded-lg"><Plus size={16} /> Add Scope</button>
                                            </div>
                                        )}

                                        {formTab === "terms" && (
                                            <div className="flex flex-col gap-4">
                                                <h3 className="font-semibold text-slate-800 mb-2 border-b pb-2">Payment Terms</h3>
                                                {formData.paymentTerms?.map((term, i) => (
                                                    <div key={i} className="flex gap-2">
                                                        <input type="text" value={term} onChange={(e) => updateArrayRow("paymentTerms", i, null, e.target.value)} className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500" />
                                                        <button onClick={() => removeArrayRow("paymentTerms", i)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Minus size={18} /></button>
                                                    </div>
                                                ))}
                                                <button onClick={() => addArrayRow("paymentTerms", "")} className="self-start flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium px-2 py-1 bg-blue-50 rounded-lg mb-4"><Plus size={16} /> Add Term</button>

                                                <div className="mt-2">
                                                    <label className="block text-xs font-semibold text-slate-800 mb-1">Delivery Info</label>
                                                    <textarea value={formData.delivery || ""} onChange={(e) => handleFormChange(e, "delivery")} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500 min-h-[80px]" />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 min-h-0 p-4 relative">
                                <div className="w-full h-full rounded-xl overflow-hidden border border-slate-200 bg-white relative">
                                    {previewLoading ? (
                                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                                            <Loader2 size={24} className="animate-spin" />
                                            <span className="ml-2">Generating PDF Preview...</span>
                                        </div>
                                    ) : previewError ? (
                                        <div className="w-full h-full flex items-center justify-center text-sm text-red-500">{previewError}</div>
                                    ) : previewUrl ? (
                                        <iframe title="Quotation preview" src={previewUrl} className="w-full h-full border-0" />
                                    ) : null}
                                </div>
                            </div>
                        )}
                    </section>
                </div>

                {/* ── Footer ── */}
                <div className="px-6 py-3.5 border-t border-slate-100 flex items-center justify-between shrink-0 bg-white">
                    <button onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-500 text-sm font-semibold cursor-pointer hover:bg-slate-50 bg-white transition-all">
                        Close
                    </button>
                    {activeTab === "form" ? (
                        <div className="flex items-center gap-3">
                            <p className="text-xs text-slate-400 hidden sm:block">Fill in the form, then preview to generate</p>
                            <button onClick={() => setActiveTab("preview")} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm font-bold border-none cursor-pointer hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-500/30 transition-all">
                                <Eye size={15} /> Review &amp; Generate
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <button onClick={() => setActiveTab("form")} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-slate-500 text-sm font-semibold bg-white cursor-pointer hover:bg-slate-50 transition-all">
                                <Edit size={14} /> Edit
                            </button>
                            <button onClick={handleDownload} disabled={previewLoading || action !== null} className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold bg-white cursor-pointer hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                                {action === "download" ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />} Download PDF
                            </button>
                            <button onClick={handleWhatsApp} disabled={previewLoading || action !== null} className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-500 text-white text-sm font-bold border-none cursor-pointer hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-emerald-500/20 hover:-translate-y-0.5 transition-all">
                                {action === "whatsapp" ? <Loader2 size={15} className="animate-spin" /> : <MessageCircle size={15} />} WhatsApp
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
