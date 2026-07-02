import React from "react";
import { useNavigate } from "react-router-dom";
import CheckUp from "../assets/CheckUp.webp";
import "./PCCheckup.css";

const categories = [
	{
		title: "PERFORMANCE ISSUES",
		options: ["Slow startup", "Frequently freezing"],
	},
	{
		title: "COMPUTER HARDWARE",
		options: [
			"Overheating",
			"Battery depletion",
			"Won't turn on",
			"Makes weird sounds",
		],
	},
	{
		title: "INTERNET AND NETWORK",
		options: ["Can't connect", "Wi-Fi drops", "Slow speed"],
	},
	{
		title: "DISPLAY ISSUES",
		options: ["Black screen", "Flickering screen", "Blurry display"],
	},
	{
		title: "SOUND ISSUES",
		options: ["No sound", "Static noise", "Mic not working"],
	},
	{
		title: "STORAGE AND DRIVE ISSUES",
		options: ["Full disk", "Data corruption", "Drive not detected"],
	},
	{
		title: "SYSTEM ISSUES",
		options: ["Blue screen", "Random restarts", "App errors", "OS won't load"],
	},
	{
		title: "SECURITY ISSUES",
		options: ["Pop-ups", "Virus suspected", "Unknown programs"],
	},
];

const readStoredJson = (key, fallback) => {
	try {
		const raw = localStorage.getItem(key);
		return raw ? JSON.parse(raw) : fallback;
	} catch {
		return fallback;
	}
};

function ReviewSelectedIssues() {
	const navigate = useNavigate();
	const [selected, setSelected] = React.useState(
		readStoredJson("diagnosticIssues", [])
	);
	const storedCategories = React.useMemo(() => {
		const fromStorage = readStoredJson("diagnosticCategories", []);
		return Array.isArray(fromStorage) && fromStorage.length ? fromStorage : categories;
	}, []);
	const [modalSelected, setModalSelected] = React.useState([]);
	const [showModal, setShowModal] = React.useState(false);
	const [modalCategory, setModalCategory] = React.useState(null);

	const selectedFirst = [
		...storedCategories.filter((cat) => (cat.options || []).some((opt) => selected.includes(opt))),
		...storedCategories.filter((cat) => !(cat.options || []).some((opt) => selected.includes(opt))),
	];


	const handlePlusClick = (cat) => {
		setModalCategory(cat);
		setShowModal(true);
		setModalSelected([]); // reset modal selection
	};

	// Toggle option in modalSelected array
	const handleModalOptionClick = (opt) => {
		setModalSelected((prev) =>
			prev.includes(opt)
				? prev.filter((o) => o !== opt)
				: [...prev, opt]
		);
	};

	// Navigate to payment window for payment method selection
	const handleSendReport = () => {
		if (selected.length === 0) {
			console.log('⚠️ No diagnostic issues selected');
			return;
		}
		
		// Prepare diagnostic issues for order creation
		const diagnosticIssues = storedCategories
			.filter(cat => (cat.options || []).some(opt => selected.includes(opt)))
			.flatMap(cat => 
				(cat.options || [])
					.filter(opt => selected.includes(opt))
					.map(issue => ({
						id: null, // Diagnostic issues don't have product IDs
						name: issue,
						price: 200, // Standard ₱200 service fee per issue
						quantity: 1,
						totalPrice: 200,
						category: cat.title,
						isDiagnostic: true
					}))
			);

		// Store diagnostic issues in localStorage for PaymentWindow
		localStorage.setItem("diagnosticIssues", JSON.stringify(diagnosticIssues));
		
		// Navigate to payment window to select payment method
		console.log('📋 Navigating to payment window with diagnostic issues:', diagnosticIssues);
		navigate("/payment-window", { state: { from: 'pc-diagnostic' } });
	};

	return (
		<div className="pc-checkup-container">
			<div className="pc-checkup-header">
				<img src={CheckUp} alt="PC Check Up" className="pc-checkup-icon" />
				<div className="pc-checkup-title">
					<h1 className="pc-checkup-name">PC CHECK UP</h1>
					<p className="pc-checkup-subtitle">Prevent the Crash</p>
				</div>
			</div>

			<div className="pc-checkup-intro">
				<h2 className="pc-checkup-section-title">EDIT SELECTED ISSUES</h2>
				<p className="pc-checkup-section-desc">Finalize the diagnostic test</p>
			</div>

			<div className="pc-checkup-content">
				<div className="pc-checkup-scrollable">
					{selectedFirst.map((cat) => {
						const options = cat.options || [];
						const selectedOptions = options.filter((opt) => selected.includes(opt));
						const allSelected = selectedOptions.length === options.length;
						const noneSelected = selectedOptions.length === 0;

						return (
							<div key={cat.title} className="pc-checkup-category">
								<h3 className="pc-checkup-category-title">{cat.title}</h3>
								<div className="pc-checkup-options-row">
									{!noneSelected &&
										selectedOptions.map((option) => (
											<button
												key={option}
												className="pc-checkup-option-btn selected"
												onClick={() => {
													const updated = selected.filter((sel) => sel !== option);
													setSelected(updated);
													localStorage.setItem("diagnosticIssues", JSON.stringify(updated));
												}}
												title="Remove"
											>
												{option}
												<span
													style={{
														position: "absolute",
														right: "8px",
														top: "50%",
														transform: "translateY(-50%)",
														color: "#002024",
														fontWeight: "bold",
														fontSize: "18px",
														cursor: "pointer",

													}}
												>
													×
												</span>
											</button>
										))}
									{!allSelected && (
										<button
											className="pc-checkup-option-btn"
											style={{
												height: "71px",
												width: "276px",
												padding: "12px 24px",
											}}
											tabIndex={-1}
											onClick={() => handlePlusClick(cat)}
										>
											+
										</button>
									)}
								</div>
							</div>
						);
					})}
				</div>
			</div>
			<div className="pc-checkup-actions">
				<button className="pc-checkup-back-btn" onClick={() => navigate(-1)}>
					Back
				</button>
				<button
					className="pc-checkup-next-btn"
					style={{
						background: selected.length === 0 ? "#00E083" : "#00e083",
						color: selected.length === 0 ? "#002024" : " ",
						cursor: selected.length === 0 ? "not-allowed" : "pointer"
					}}
					disabled={selected.length === 0}
					onClick={handleSendReport}
				>
					Send Report
				</button>
			</div>

			{showModal && modalCategory && (
				<div className="pc-checkup-modal-overlay">
					<div className="pc-checkup-modal-background"></div>
					<div className="pc-checkup-modal">
						<h2 className="pc-checkup-modal-title">
							More Options for <br />
							<span>{modalCategory.title}</span>
						</h2>
						<div className="pc-checkup-modal-options">
							{modalCategory.options
								.filter((opt) => !selected.includes(opt))
								.map((opt) => (
									<button
										key={opt}
										className={`pc-checkup-option-btn${modalSelected.includes(opt) ? " selected" : ""
											}`}
										onClick={() => handleModalOptionClick(opt)}
									>
										{opt}
									</button>
								))}
						</div>
						<div style={{ display: "flex", gap: "16px", marginTop: "24px" }}>

							<button
								className="pc-checkup-cancel-btn"
								onClick={() => {
									setShowModal(false);
									setModalCategory(null);
									setModalSelected([]);
								}}
							>
								Cancel
							</button>

							<button
								className="pc-checkup-select-btn"
								disabled={modalSelected.length === 0}
								onClick={() => {
									if (modalSelected.length > 0) {
										const updated = [...selected, ...modalSelected];
										localStorage.setItem("diagnosticIssues", JSON.stringify(updated));
										setShowModal(false);
										setModalCategory(null);
										setSelected(updated);
										setModalSelected([]);
									}
								}}
							>
								Select
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

export default ReviewSelectedIssues;
