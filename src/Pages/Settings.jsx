import { useState, useEffect } from "react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";
import { motion } from "framer-motion";
import { Loader2, Save, UploadCloud, Trash2, Image as ImageIcon, Building, Phone, MapPin, FileText, Settings as SettingsIcon } from "lucide-react";
import toast from "react-hot-toast";

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

export default function Settings() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);

    const [formData, setFormData] = useState({
        companyName: "",
        companyAddress1: "",
        companyAddress2: "",
        gstin: "",
        udyam: "",
        contact1Name: "",
        contact1Phone: "",
        contact2Name: "",
        contact2Phone: "",
        aboutText: "",
        logoImage: "",
        bankName: "",
        accountName: "",
        accountNumber: "",
        ifscCode: "",
        branch: "",
        expertiseList: []
    });

    useEffect(() => {
        async function fetchSettings() {
            setLoading(true);
            try {
                const docRef = doc(db, "settings", "branding");
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setFormData(prev => ({ ...prev, ...docSnap.data() }));
                }
            } catch (error) {
                console.error("Failed to load settings:", error);
                toast.error("Failed to load global settings");
            } finally {
                setLoading(false);
            }
        }
        fetchSettings();
    }, []);

    const handleUpload = async (file) => {
        if (!file) return;
        setUploadingImage(true);
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
                setFormData(p => ({ ...p, logoImage: result.secure_url }));
                toast.success("Logo uploaded!");
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

    const addExpertise = () => {
        setFormData(p => ({ ...p, expertiseList: [...(p.expertiseList || []), ""] }));
    };

    const removeExpertise = (index) => {
        setFormData(p => ({ ...p, expertiseList: p.expertiseList.filter((_, i) => i !== index) }));
    };

    const updateExpertise = (index, value) => {
        const newArray = [...(formData.expertiseList || [])];
        newArray[index] = value;
        setFormData(p => ({ ...p, expertiseList: newArray }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await setDoc(doc(db, "settings", "branding"), {
                ...formData,
                updatedAt: serverTimestamp()
            }, { merge: true });
            toast.success("Settings saved successfully!");
        } catch (error) {
            console.error("Failed to save settings:", error);
            toast.error("Failed to save settings");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full min-h-[400px]">
                <Loader2 size={32} className="animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto pb-12">
            <div className="flex items-center gap-3 mb-8 border-b border-slate-200 pb-5">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                    <SettingsIcon size={24} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Global Settings</h1>
                    <p className="text-sm text-slate-500 mt-1">Manage your company branding and PDF content</p>
                </div>
            </div>

            <motion.form initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} onSubmit={handleSave} className="space-y-8 bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">

                {/* Branding Section */}
                <div>
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-6">
                        <Building size={20} className="text-blue-500" /> Company Identity
                    </h2>

                    <div className="grid grid-cols-[240px_1fr] max-md:grid-cols-1 gap-8">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-3">Company Logo</label>
                            <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors relative h-48 bg-slate-50/50">
                                {formData.logoImage ? (
                                    <img src={formData.logoImage} alt="Logo" className="max-h-full max-w-full object-contain" />
                                ) : (
                                    <>
                                        <ImageIcon size={40} className="text-slate-300 mb-3" />
                                        <span className="text-xs text-slate-500 font-medium">Click to upload logo</span>
                                    </>
                                )}
                                <input type="file" accept="image/*" onChange={(e) => handleUpload(e.target.files[0])} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                {uploadingImage && <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-xl"><Loader2 className="animate-spin text-blue-500" /></div>}
                            </div>
                        </div>

                        <div className="space-y-5">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Company Name</label>
                                <input type="text" placeholder="e.g. VR SOLARTECH" value={formData.companyName} onChange={e => setFormData(p => ({ ...p, companyName: e.target.value }))} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 focus:bg-white transition-all" />
                            </div>
                            <div className="grid grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">GSTIN</label>
                                    <input type="text" value={formData.gstin} onChange={e => setFormData(p => ({ ...p, gstin: e.target.value }))} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 focus:bg-white transition-all" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">UDYAM</label>
                                    <input type="text" value={formData.udyam} onChange={e => setFormData(p => ({ ...p, udyam: e.target.value }))} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 focus:bg-white transition-all" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <hr className="border-slate-100" />

                {/* Location Section */}
                <div>
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-6">
                        <MapPin size={20} className="text-emerald-500" /> Addresses & Locations
                    </h2>
                    <div className="grid grid-cols-2 max-md:grid-cols-1 gap-5">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Address Line 1</label>
                            <textarea rows={2} value={formData.companyAddress1} onChange={e => setFormData(p => ({ ...p, companyAddress1: e.target.value }))} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 focus:bg-white transition-all resize-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Address Line 2 (Optional)</label>
                            <textarea rows={2} value={formData.companyAddress2} onChange={e => setFormData(p => ({ ...p, companyAddress2: e.target.value }))} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 focus:bg-white transition-all resize-none" />
                        </div>
                    </div>
                </div>

                <hr className="border-slate-100" />

                {/* Contacts Section */}
                <div>
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-6">
                        <Phone size={20} className="text-purple-500" /> Contact Persons
                    </h2>
                    <div className="grid grid-cols-2 max-md:grid-cols-1 gap-8">
                        <div className="space-y-5 p-5 bg-slate-50 rounded-xl border border-slate-100">
                            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2">Primary Contact</h3>
                            <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Name</label><input type="text" value={formData.contact1Name} onChange={e => setFormData(p => ({ ...p, contact1Name: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
                            <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Phone</label><input type="text" value={formData.contact1Phone} onChange={e => setFormData(p => ({ ...p, contact1Phone: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
                        </div>
                        <div className="space-y-5 p-5 bg-slate-50 rounded-xl border border-slate-100">
                            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2">Secondary Contact</h3>
                            <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Name</label><input type="text" value={formData.contact2Name} onChange={e => setFormData(p => ({ ...p, contact2Name: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
                            <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Phone</label><input type="text" value={formData.contact2Phone} onChange={e => setFormData(p => ({ ...p, contact2Phone: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
                        </div>
                    </div>
                </div>

                <hr className="border-slate-100" />

                {/* About Us Content */}
                <div>
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-6">
                        <FileText size={20} className="text-orange-500" /> Custom "About Us" PDF Content
                    </h2>
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">About Us Paragraph</label>
                            <textarea rows={4} placeholder="We at VR SolarTech are energy consultants..." value={formData.aboutText} onChange={e => setFormData(p => ({ ...p, aboutText: e.target.value }))} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 focus:bg-white transition-all resize-y" />
                            <p className="text-xs text-slate-500 mt-2">This text replaces the default 'About us' section printed on page 2 of your quotations.</p>
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-3">
                                <label className="block text-sm font-semibold text-slate-700">Our Areas of Expertise</label>
                                <button type="button" onClick={addExpertise} className="text-xs flex items-center gap-1 text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors font-semibold">
                                    + Add Point
                                </button>
                            </div>
                            <div className="space-y-2">
                                {(formData.expertiseList || []).map((item, i) => (
                                    <div key={i} className="flex gap-2">
                                        <input type="text" value={item} onChange={e => updateExpertise(i, e.target.value)} className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 focus:bg-white transition-all" placeholder={`Expertise point ${i + 1}`} />
                                        <button type="button" onClick={() => removeExpertise(i)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 bg-white rounded-lg border border-slate-200 transition-colors"><Trash2 size={16} /></button>
                                    </div>
                                ))}
                                {(!formData.expertiseList || formData.expertiseList.length === 0) && (
                                    <p className="text-xs text-slate-400 italic">No expertise points added. Click "+ Add Point" to create a list.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <hr className="border-slate-100" />

                {/* Bank Details Section */}
                <div>
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-6">
                        <FileText size={20} className="text-amber-500" /> Bank Details
                    </h2>
                    <div className="grid grid-cols-2 max-md:grid-cols-1 gap-5">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Bank Name</label>
                            <input type="text" placeholder="e.g. Canara Bank" value={formData.bankName} onChange={e => setFormData(p => ({ ...p, bankName: e.target.value }))} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 focus:bg-white transition-all" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Account Holder Name</label>
                            <input type="text" placeholder="e.g. VR SolarTech" value={formData.accountName} onChange={e => setFormData(p => ({ ...p, accountName: e.target.value }))} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 focus:bg-white transition-all" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Account Number</label>
                            <input type="text" placeholder="e.g. 120036111454" value={formData.accountNumber} onChange={e => setFormData(p => ({ ...p, accountNumber: e.target.value }))} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 focus:bg-white transition-all" />
                        </div>
                        <div className="grid grid-cols-2 gap-5">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">IFSC Code</label>
                                <input type="text" placeholder="e.g. CNRB0008172" value={formData.ifscCode} onChange={e => setFormData(p => ({ ...p, ifscCode: e.target.value }))} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 focus:bg-white transition-all" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Branch</label>
                                <input type="text" placeholder="e.g. Karjat" value={formData.branch} onChange={e => setFormData(p => ({ ...p, branch: e.target.value }))} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 focus:bg-white transition-all" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pt-6 border-t border-slate-200 flex justify-end">
                    <button type="submit" disabled={saving} className="px-8 py-3 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 hover:-translate-y-0.5 shadow-lg shadow-blue-500/30 transition-all flex items-center gap-2 disabled:opacity-70 disabled:hover:translate-y-0">
                        {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                        {saving ? "Saving Changes..." : "Save Settings"}
                    </button>
                </div>
            </motion.form>
        </div>
    );
}
