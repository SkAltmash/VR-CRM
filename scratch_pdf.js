import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getQuotationTypeById } from "./quotationTypes";

const COMPANY = {
    name: "VR SOLARTECH",
    address1: "Address-1:- At-Chandhai, Post-Nasrapur, Tal-Karjat, Dist-Raigad, Pin-410 201",
    address2: "Address-2:- F-78, Sector-3, Airoli, Dist-Thane, Pin- 400 708",
    gstin: "GSTIN- 27BPDPR1875K1ZD",
    udyam: "UDYAM-MH-27-0212664",
    contacts: [
        { name: "Sunil B Rasal", phone: "9545966868" },
        { name: "Vaibhav S Rasal", phone: "7977876208" },
    ],
};

const PAGE_COUNT = 8;
const PAGE_WIDTH = 595.3;
const PAGE_HEIGHT = 841.9;
const MARGIN_X = 44;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;

let logoDataUrlPromise;

function safeText(value, fallback = "") {
    return String(value || fallback).trim();
}

function formatDate(date = new Date()) {
    return date.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

function formatFileDate(date = new Date()) {
    return date.toISOString().slice(0, 10);
}

function sanitizeFileName(value) {
    return safeText(value, "Lead").replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "");
}

function getQuotationNo(lead, type) {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const phone = safeText(lead.phone).replace(/\D/g, "");
    const suffix = phone.slice(-4) || String(Date.now()).slice(-4);
    return `Q${yy}${suffix}-${type.id.toUpperCase().slice(0, 3)}`;
}

async function loadLogoDataUrl() {
    if (!logoDataUrlPromise) {
        logoDataUrlPromise = fetch("/logo.png")
            .then((response) => {
                if (!response.ok) throw new Error("Logo not found");
                return response.blob();
            })
            .then((blob) => new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            }))
            .catch((err) => {
                console.warn("Failed to load PDF logo:", err);
                return null;
            });
    }
    return logoDataUrlPromise;
}

function drawHeader(doc, pageNumber, logoDataUrl) {
    if (logoDataUrl) {
        doc.addImage(logoDataUrl, "PNG", MARGIN_X, 16, 42, 42);
    }

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.6);
    doc.line(MARGIN_X, 82, PAGE_WIDTH - MARGIN_X, 82);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text(COMPANY.name, PAGE_WIDTH / 2, 28, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    doc.text(COMPANY.address1, PAGE_WIDTH / 2, 45, { align: "center" });
    doc.text(COMPANY.address2, PAGE_WIDTH / 2, 59, { align: "center" });
    doc.text(COMPANY.gstin, MARGIN_X, 74);
    doc.text(COMPANY.udyam, PAGE_WIDTH - MARGIN_X, 74, { align: "right" });

    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(`Contact No.:- ${COMPANY.contacts[0].name}: ${COMPANY.contacts[0].phone}`, MARGIN_X, PAGE_HEIGHT - 32);
    doc.text(`${COMPANY.contacts[1].name}: ${COMPANY.contacts[1].phone}`, MARGIN_X + 58, PAGE_HEIGHT - 18);
    doc.text(`Page ${pageNumber} of ${PAGE_COUNT}`, PAGE_WIDTH - MARGIN_X, PAGE_HEIGHT - 18, { align: "right" });
}

function addPage(doc, pageNumber, logoDataUrl) {
    if (pageNumber > 1) doc.addPage();
    drawHeader(doc, pageNumber, logoDataUrl);
    return 105;
}

function sectionTitle(doc, title, y) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(title, MARGIN_X, y);
    return y + 18;
}

function paragraph(doc, text, y, options = {}) {
    const width = options.width || CONTENT_WIDTH;
    const lineHeight = options.lineHeight || 13;
    const fontSize = options.fontSize || 9.5;
    const x = options.x || MARGIN_X;

    doc.setFont("helvetica", options.bold ? "bold" : "normal");
    doc.setFontSize(fontSize);
    doc.setTextColor(options.color || 51, options.colorG || 65, options.colorB || 85);

    const lines = doc.splitTextToSize(text, width);
    doc.text(lines, x, y);
    return y + lines.length * lineHeight + (options.after || 8);
}

function bulletList(doc, items, y) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(51, 65, 85);

    items.forEach((item) => {
        const lines = doc.splitTextToSize(item, CONTENT_WIDTH - 16);
        doc.text("-", MARGIN_X, y);
        doc.text(lines, MARGIN_X + 14, y);
        y += lines.length * 13 + 5;
    });

    return y + 4;
}

function drawDiagramBox(doc, title, y, lines) {
    doc.setDrawColor(191, 219, 254);
    doc.setFillColor(239, 246, 255);
    doc.roundedRect(MARGIN_X, y, CONTENT_WIDTH, 86, 6, 6, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(37, 99, 235);
    doc.text(title, PAGE_WIDTH / 2, y + 26, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    lines.forEach((line, index) => {
        doc.text(line, PAGE_WIDTH / 2, y + 48 + index * 14, { align: "center" });
    });

    return y + 106;
}

function buildPageOne(doc, lead, type, logoDataUrl) {
    let y = addPage(doc, 1, logoDataUrl);
    const today = new Date();

    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(15, 23, 42);
    doc.text("Quotation", PAGE_WIDTH / 2, y, { align: "center" });
    y += 28;

    doc.setFontSize(9.5);
    doc.text(`Quotation - ${getQuotationNo(lead, type)}`, MARGIN_X, y);
    doc.setFont("helvetica", "normal");
    doc.text(formatDate(today), PAGE_WIDTH - MARGIN_X, y, { align: "right" });
    y += 16;
    doc.text("Issue Version - V.1", PAGE_WIDTH - MARGIN_X, y, { align: "right" });
    y += 28;

    const customerName = safeText(lead.name, "Customer");
    const place = safeText(lead.company || lead.source);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("To,", MARGIN_X, y);
    y += 16;
    doc.text(place ? `${customerName}, ${place}` : customerName, MARGIN_X, y);
    y += 16;
    if (lead.phone) {
        doc.text(safeText(lead.phone), MARGIN_X, y);
        y += 26;
    }

    doc.setFont("helvetica", "bold");
    doc.text(`Project - ${type.projectTitle}`, MARGIN_X, y);
    y += 34;

    y = sectionTitle(doc, "Statement of Confidentiality", y);
    y = paragraph(doc, "These documents contain proprietary trade secret and confidential information to be used solely for evaluating VR SolarTech. The information contained herein is to be considered confidential. Customer, by receiving these documents agrees that neither this document nor the information disclosed herein, nor any part thereof, shall be reproduced or transferred to other documents or used or disclosed to others for any purpose except as specifically authorized in writing by VR SolarTech.", y, { lineHeight: 14 });

    y += 14;
    autoTable(doc, {
        startY: y,
        margin: { left: MARGIN_X, right: MARGIN_X },
        theme: "plain",
        body: [
            ["Project:-", type.projectName, "Prepared By:", "VR SolarTech"],
            ["Preparation Date:-", formatDate(today), "Quotation Type:", type.name],
        ],
        styles: { fontSize: 9.5, cellPadding: 4, textColor: [51, 65, 85] },
        columnStyles: {
            0: { fontStyle: "bold", cellWidth: 92 },
            1: { cellWidth: 170 },
            2: { fontStyle: "bold", cellWidth: 96 },
            3: { cellWidth: 150 },
        },
    });
}

function buildPageTwo(doc, type, logoDataUrl) {
    let y = addPage(doc, 2, logoDataUrl);
    y = paragraph(doc, "To,", y, { after: 4 });
    y = paragraph(doc, "Respected sir", y, { after: 12 });
    y = paragraph(doc, type.intro, y, { lineHeight: 14 });
    y = paragraph(doc, "This proposal has been designed as per the detailed analysis of the site and is based on your electricity bill calculation, requirement, and the space available.", y, { lineHeight: 14 });

    y = sectionTitle(doc, "About us:-", y + 4);
    y = paragraph(doc, "We at VR SolarTech are energy consultants and engineering, procurement, and construction (EPC) specialists for residential, commercial, and industrial power. We understand our customers' energy consumption patterns and work out an economically viable plan for switching to renewable energy sources. We also provide solar street lights, solar home lighting systems, and other solar products.", y, { lineHeight: 14 });
    y = paragraph(doc, "VR SolarTech is dedicated to providing technically sound and economically viable solutions. We provide solutions to our customers and have expertise in delivering projects on a turnkey basis in Solar Power Generation.", y, { lineHeight: 14 });

    y = paragraph(doc, "Our areas of expertise include the following:", y, { after: 8 });
    y = bulletList(doc, [
        "Design and Engineering",
        "Project Management",
        "Supply of Modules, Inverter, and Balance of System (BOS)",
        "Erection and Commissioning",
        "System Stabilization",
        "Monitoring, Operation and Maintenance",
    ], y);

    paragraph(doc, "Solar energy helps the country for better environment with Green Energy.", y + 8, { bold: true });
}

function buildPageThree(doc, type, logoDataUrl) {
    let y = addPage(doc, 3, logoDataUrl);
    y = sectionTitle(doc, `How does ${type.projectName} work?`, y);
    y = drawDiagramBox(doc, type.diagramTitle, y + 8, type.diagramLines);
    y = paragraph(doc, "The solar panels convert sunlight into electric energy, which is Direct Current (DC). This current is sent to an inverter or controller as per the system design. The power is then converted or regulated for useful consumption at the customer site.", y, { lineHeight: 14 });
    y = paragraph(doc, "The system design, equipment sizing, protection devices, cabling, and commissioning process are selected based on site condition, electrical load, available space, and applicable standards.", y, { lineHeight: 14 });
    paragraph(doc, "All electrical components will be tested in accordance with manufacturer instructions and project requirements before handover.", y, { lineHeight: 14 });
}

function buildPageFour(doc, type, logoDataUrl) {
    let y = addPage(doc, 4, logoDataUrl);
    y = sectionTitle(doc, type.benefitsTitle, y);
    y = bulletList(doc, type.benefits, y);

    y = sectionTitle(doc, "Single Line Diagram", y + 8);
    y = drawDiagramBox(doc, "SOLAR POWER SYSTEM FLOW", y + 8, type.diagramLines);

    paragraph(doc, "A Solar Power system consists of following main elements:", y, { bold: true, after: 8 });
    paragraph(doc, "Solar Panels | Mounting Structure | Inverter / Controller | Solar Cables & Connectors | Protection System | Distribution Box", y + 24, { lineHeight: 14 });
}

function buildPageFive(doc, type, logoDataUrl) {
    let y = addPage(doc, 5, logoDataUrl);
    autoTable(doc, {
        startY: y,
        margin: { left: MARGIN_X, right: MARGIN_X },
        head: [["Parts / Material", "Make", "Specification"]],
        body: type.materialRows,
        styles: { fontSize: 8.5, cellPadding: 6, textColor: [51, 65, 85], lineColor: [226, 232, 240], lineWidth: 0.5 },
        headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255] },
    });

    y = doc.lastAutoTable.finalY + 20;
    y = sectionTitle(doc, "Material Reports:-", y);
    y = paragraph(doc, "Panels Data Sheet\nInverter / Equipment Test Certificate", y, { lineHeight: 14 });
    y = paragraph(doc, "All the material is approved as per applicable guidelines and selected for proper generation, safety, and long service life.", y, { lineHeight: 14 });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text("FINANCIAL OFFER", PAGE_WIDTH / 2, y + 16, { align: "center" });

    autoTable(doc, {
        startY: y + 32,
        margin: { left: MARGIN_X, right: MARGIN_X },
        head: [["Description", "Rate", "Total", "Discount", "Total"]],
        body: type.financialRows,
        styles: { fontSize: 8.5, cellPadding: 6, textColor: [51, 65, 85], lineColor: [226, 232, 240], lineWidth: 0.5 },
        headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255] },
        columnStyles: { 3: { fontStyle: "bold" }, 4: { fontStyle: "bold" } },
    });

    y = doc.lastAutoTable.finalY + 18;
    y = paragraph(doc, `IN WORDS: - ${type.amountWords}`, y, { bold: true, after: 14 });
    y = paragraph(doc, "Note*: GST will be applied as per applicable government norms. All taxes, installation, structure, and service inclusions will follow the final agreed scope.", y, { lineHeight: 13 });
    paragraph(doc, "Note: Any additional fabrication charges will be paid extra as per changes if done or if required by clients.", y + 4, { lineHeight: 13 });
}

function buildPageSix(doc, logoDataUrl) {
    let y = addPage(doc, 6, logoDataUrl);
    y = sectionTitle(doc, "Warrantee Details:-", y);
    y = paragraph(doc, "Panels:", y, { bold: true, after: 8 });
    y = paragraph(doc, "The solar modules are warranted by the solar panel manufacturer for a period of 25 years. The warranty of modules and their respective DC connectors and cables shall be free from material defects in design, materials, and workmanship that affect the performance of the module.", y, { lineHeight: 14 });
    y = paragraph(doc, "Performance warranty for the system:", y + 4, { bold: true, after: 8 });
    y = paragraph(doc, "80% efficiency up to 25 years", y, { lineHeight: 14 });
    y = paragraph(doc, "Inverter / Equipment:", y + 4, { bold: true, after: 8 });
    y = paragraph(doc, "Inverter and equipment warranty will be as per manufacturer warranty terms. Additional warranty can be added by paying additional charges where applicable.", y, { lineHeight: 14 });
    y = paragraph(doc, "Balance of the Systems:", y + 4, { bold: true, after: 8 });
    y = paragraph(doc, "A standard 12-month warranty against manufacturing defects is provided. After the warranty period, spares will be supplied for the system at actual cost.", y, { lineHeight: 14 });
    y = paragraph(doc, "Note:", y + 4, { bold: true, after: 8 });
    bulletList(doc, [
        "All warranty will start from the date of delivery",
        "Test Report will be provided after completion",
        "Performance report will be provided after 7 days of live working site where applicable",
    ], y);
}

function buildPageSeven(doc, logoDataUrl) {
    let y = addPage(doc, 7, logoDataUrl);
    y = sectionTitle(doc, "VR SolarTech Scope of work:-", y);
    y = bulletList(doc, [
        "Prepare a full system design to include civil, structural, electrical, and mechanical components, with construction drawings and specifications.",
        "Procure equipment and materials and deliver to site.",
        "Perform complete system installation.",
        "Test all electrical components in accordance with manufacturer instructions.",
        "Commission the system to full operability.",
    ], y);

    y = sectionTitle(doc, "Client scope:-", y + 10);
    bulletList(doc, [
        "Provide all the papers and documentation required for approval or net metering where applicable.",
        "Provide a suitable and secure space for storage of equipment and materials.",
        "Provide permission and approval for project execution.",
        "Any government, electricity operator, or net metering charges to be paid as per actual where applicable.",
        "Facilitate access of work crew to the work site 7 days a week.",
        "Provision of water during cleaning of solar panels.",
        "Providing labor manpower at the site if required.",
        "Additional ladder to access the roof if required.",
        "Core cutting if the earthing location has RCC surface.",
    ], y);
}

function buildPageEight(doc, type, logoDataUrl) {
    let y = addPage(doc, 8, logoDataUrl);
    y = sectionTitle(doc, "Terms & conditions:-", y);
    y = paragraph(doc, "System Information", y, { bold: true, after: 8 });
    y = paragraph(doc, "System will be installed by our certified system Integrator.", y, { lineHeight: 14 });
    y = paragraph(doc, "Delivery", y + 4, { bold: true, after: 8 });
    y = paragraph(doc, type.delivery, y, { lineHeight: 14 });
    y = paragraph(doc, "Payment Terms:-", y + 4, { bold: true, after: 8 });
    y = paragraph(doc, type.paymentTerms.join("\n"), y, { lineHeight: 14 });

    y = paragraph(doc, "Bank Details:-", y + 8, { bold: true, after: 8 });
    autoTable(doc, {
        startY: y,
        margin: { left: MARGIN_X, right: MARGIN_X },
        head: [["Bank Name", "Account Holder Name", "Account Number", "IFSC Code", "Branch"]],
        body: [["Canara Bank", "VR SolarTech", "120036111454", "CNRB0008172", "Karjat"]],
        styles: { fontSize: 8.5, cellPadding: 6, textColor: [51, 65, 85], lineColor: [226, 232, 240], lineWidth: 0.5 },
        headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255] },
    });

    y = doc.lastAutoTable.finalY + 28;
    y = paragraph(doc, "We look forward to your response and the opportunity to work with you!", y, { lineHeight: 14 });
    y = paragraph(doc, "Any dispute will be consider under Mumbai Jurisdiction", y + 20, { lineHeight: 14 });
    y = paragraph(doc, "Regards,", y + 20, { after: 34 });
    paragraph(doc, "VR SolarTech", y, { bold: true });
}

export async function createQuotationPdf(lead, quotationTypeId) {
    const type = getQuotationTypeById(quotationTypeId);
    const logoDataUrl = await loadLogoDataUrl();
    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
    doc.setProperties({
        title: `Quotation - ${safeText(lead.name, "Customer")}`,
        subject: `${type.name} quotation`,
        author: COMPANY.name,
    });

    buildPageOne(doc, lead, type, logoDataUrl);
    buildPageTwo(doc, type, logoDataUrl);
    buildPageThree(doc, type, logoDataUrl);
    buildPageFour(doc, type, logoDataUrl);
    buildPageFive(doc, type, logoDataUrl);
    buildPageSix(doc, logoDataUrl);
    buildPageSeven(doc, logoDataUrl);
    buildPageEight(doc, type, logoDataUrl);

    return { doc, type };
}

export async function createQuotationPreviewUrl(lead, quotationTypeId) {
    const { doc } = await createQuotationPdf(lead, quotationTypeId);
    return URL.createObjectURL(doc.output("blob"));
}

export async function downloadQuotationPdf(lead, quotationTypeId) {
    const { doc, type } = await createQuotationPdf(lead, quotationTypeId);
    doc.save(`${sanitizeFileName(lead.name)}_${sanitizeFileName(type.name)}_${formatFileDate()}.pdf`);
    return type;
}
