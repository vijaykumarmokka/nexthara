import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { bankAdminApi } from '../../api';

const CRITERIA_TYPES = ['MIN_INCOME', 'MIN_CIBIL', 'COUNTRY', 'COURSE_TYPE', 'MAX_AGE', 'COLLATERAL_MIN'];

export default function BankSetupPage({ bankId }) {
  const [bank, setBank] = useState(null);
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productDetail, setProductDetail] = useState(null);
  const [tab, setTab] = useState('bank');
  const [loading, setLoading] = useState(true);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showCriterionModal, setShowCriterionModal] = useState(false);
  const [showDocModal, setShowDocModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [bankForm, setBankForm] = useState({});
  const [productForm, setProductForm] = useState({ product_name: '', loan_type: 'UNSECURED', min_amount_paise: '', max_amount_paise: '', interest_range: '', tenure_range: '', processing_fee_percent: '', collateral_required: false, coapp_required: false });
  const [criterionForm, setCriterionForm] = useState({ criteria_type: 'MIN_INCOME', criteria_value: '' });
  const [docForm, setDocForm] = useState({ doc_code: '', mandatory: true, order_no: '' });

  const load = async () => {
    setLoading(true);
    try {
      const [b, p] = await Promise.all([bankAdminApi.getBank(bankId), bankAdminApi.getProducts(bankId)]);
      setBank(b); setProducts(p);
      setBankForm({ name: b.name, logo_url: b.logo_url || '', country: b.country || 'India', default_sla_days: b.default_sla_days || 7 });
    } catch { toast.error('Failed to load bank data'); }
    setLoading(false);
  };

  useEffect(() => { if (bankId) load(); }, [bankId]);

  const loadProduct = async (productId) => {
    try {
      const detail = await bankAdminApi.getProduct(productId);
      setProductDetail(detail);
    } catch { toast.error('Failed to load product details'); }
  };

  useEffect(() => {
    if (selectedProduct) loadProduct(selectedProduct);
  }, [selectedProduct]);

  const saveBank = async () => {
    setSaving(true);
    try {
      await bankAdminApi.updateBank(bankId, bankForm);
      toast.success('Bank details updated');
    } catch (e) { toast.error(e.message); }
    setSaving(false);
  };

  const createProduct = async () => {
    setSaving(true);
    try {
      await bankAdminApi.createProduct(bankId, {
        ...productForm,
        min_amount_paise: parseInt(productForm.min_amount_paise) || 0,
        max_amount_paise: parseInt(productForm.max_amount_paise) || 0,
        processing_fee_percent: parseFloat(productForm.processing_fee_percent) || 0,
      });
      toast.success('Product created');
      setShowProductModal(false);
      setProductForm({ product_name: '', loan_type: 'UNSECURED', min_amount_paise: '', max_amount_paise: '', interest_range: '', tenure_range: '', processing_fee_percent: '', collateral_required: false, coapp_required: false });
      const p = await bankAdminApi.getProducts(bankId); setProducts(p);
    } catch (e) { toast.error(e.message); }
    setSaving(false);
  };

  const deleteProduct = async (productId) => {
    if (!window.confirm('Delete this product and all its criteria/documents?')) return;
    try {
      await bankAdminApi.deleteProduct(productId);
      toast.success('Product deleted');
      if (selectedProduct === productId) { setSelectedProduct(null); setProductDetail(null); }
      const p = await bankAdminApi.getProducts(bankId); setProducts(p);
    } catch (e) { toast.error(e.message); }
  };

  const addCriterion = async () => {
    setSaving(true);
    try {
      let val = criterionForm.criteria_value;
      try { val = JSON.parse(val); } catch { /* keep as string */ }
      await bankAdminApi.addCriterion(selectedProduct, { criteria_type: criterionForm.criteria_type, criteria_value: val });
      toast.success('Criterion added');
      setShowCriterionModal(false);
      await loadProduct(selectedProduct);
    } catch (e) { toast.error(e.message); }
    setSaving(false);
  };

  const deleteCriterion = async (id) => {
    try {
      await bankAdminApi.deleteCriterion(id);
      toast.success('Removed');
      await loadProduct(selectedProduct);
    } catch (e) { toast.error(e.message); }
  };

  const addDoc = async () => {
    setSaving(true);
    try {
      await bankAdminApi.addProductDoc(selectedProduct, { doc_code: docForm.doc_code, mandatory: docForm.mandatory, order_no: parseInt(docForm.order_no) || 0 });
      toast.success('Document added');
      setShowDocModal(false);
      setDocForm({ doc_code: '', mandatory: true, order_no: '' });
      await loadProduct(selectedProduct);
    } catch (e) { toast.error(e.message); }
    setSaving(false);
  };

  const deleteDoc = async (id) => {
    try {
      await bankAdminApi.deleteProductDoc(id);
      toast.success('Removed');
      await loadProduct(selectedProduct);
    } catch (e) { toast.error(e.message); }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}><i className="fas fa-spinner fa-spin" style={{ fontSize: 24 }}></i></div>;

  const inputStyle = { width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, outline: 'none', fontFamily: 'Roboto, sans-serif' };
  const labelStyle = { display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 4 };

  return (
    <div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '2px solid #e5e7eb', paddingBottom: 0 }}>
        {[['bank', 'Bank Details'], ['products', 'Loan Products']].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} style={{
            padding: '10px 20px', border: 'none', background: 'transparent', fontSize: 13, fontWeight: 500,
            color: tab === k ? '#0d7377' : '#6b7280', borderBottom: `3px solid ${tab === k ? '#0d7377' : 'transparent'}`,
            cursor: 'pointer', fontFamily: 'Roboto, sans-serif', marginBottom: -2,
          }}>{l}</button>
        ))}
      </div>

      {/* Bank Details Tab */}
      {tab === 'bank' && (
        <div style={{ background: '#fff', borderRadius: 10, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', maxWidth: 600 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#0d7377', marginBottom: 20 }}>Bank Master Details</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            {[
              { label: 'Bank Name', key: 'name' },
              { label: 'Country', key: 'country' },
              { label: 'Logo URL', key: 'logo_url' },
              { label: 'Default SLA Days', key: 'default_sla_days', type: 'number' },
            ].map(({ label, key, type }) => (
              <div key={key}>
                <label style={labelStyle}>{label}</label>
                <input type={type || 'text'} style={inputStyle} value={bankForm[key] || ''} onChange={e => setBankForm(f => ({ ...f, [key]: e.target.value }))} />
              </div>
            ))}
          </div>
          <button onClick={saveBank} disabled={saving} style={{ padding: '9px 20px', background: '#0d7377', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}

      {/* Products Tab */}
      {tab === 'products' && (
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20 }}>
          {/* Product List */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>Products ({products.length})</div>
              <button onClick={() => setShowProductModal(true)} style={{ padding: '5px 12px', background: '#0d7377', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>
                <i className="fas fa-plus" style={{ marginRight: 4 }}></i> Add
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {products.map(p => (
                <div key={p.id} onClick={() => setSelectedProduct(p.id)} style={{
                  background: selectedProduct === p.id ? '#e0f2f1' : '#fff',
                  border: `1px solid ${selectedProduct === p.id ? '#0d7377' : '#e5e7eb'}`,
                  borderRadius: 8, padding: '12px 14px', cursor: 'pointer',
                }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 4 }}>{p.product_name}</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: p.loan_type === 'SECURED' ? '#fef3c7' : '#dbeafe', color: p.loan_type === 'SECURED' ? '#b45309' : '#1565c0', fontWeight: 600 }}>{p.loan_type}</span>
                    <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: p.is_active ? '#dcfce7' : '#f3f4f6', color: p.is_active ? '#16a34a' : '#6b7280', fontWeight: 600 }}>{p.is_active ? 'Active' : 'Inactive'}</span>
                  </div>
                </div>
              ))}
              {products.length === 0 && <div style={{ color: '#9ca3af', fontSize: 13, textAlign: 'center', padding: 20 }}>No products yet</div>}
            </div>
          </div>

          {/* Product Detail */}
          <div>
            {!selectedProduct && (
              <div style={{ background: '#fff', borderRadius: 10, padding: 40, textAlign: 'center', color: '#9ca3af', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                <i className="fas fa-box-open" style={{ fontSize: 32, marginBottom: 12, display: 'block' }}></i>
                Select a product to view details
              </div>
            )}
            {selectedProduct && productDetail && (
              <div>
                <div style={{ background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>{productDetail.product_name}</div>
                      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{productDetail.loan_type} · {productDetail.interest_range || 'Rate TBD'}</div>
                    </div>
                    <button onClick={() => deleteProduct(selectedProduct)} style={{ padding: '5px 10px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>
                      <i className="fas fa-trash" style={{ marginRight: 4 }}></i> Delete
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                    {[
                      { label: 'Min Amount', value: productDetail.min_amount_paise ? `₹${(productDetail.min_amount_paise / 100).toLocaleString()}` : '—' },
                      { label: 'Max Amount', value: productDetail.max_amount_paise ? `₹${(productDetail.max_amount_paise / 100).toLocaleString()}` : '—' },
                      { label: 'Processing Fee', value: `${productDetail.processing_fee_percent || 0}%` },
                      { label: 'Tenure Range', value: productDetail.tenure_range || '—' },
                      { label: 'Collateral', value: productDetail.collateral_required ? 'Required' : 'Not Required' },
                      { label: 'Co-applicant', value: productDetail.coapp_required ? 'Required' : 'Optional' },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ background: '#f9fafb', borderRadius: 6, padding: '10px 12px' }}>
                        <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{label}</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Eligibility Criteria */}
                <div style={{ background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>Eligibility Criteria</div>
                    <button onClick={() => setShowCriterionModal(true)} style={{ padding: '4px 10px', background: '#0d7377', color: '#fff', border: 'none', borderRadius: 5, fontSize: 12, cursor: 'pointer' }}>+ Add</button>
                  </div>
                  {productDetail.criteria?.map(c => (
                    <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                      <div>
                        <span style={{ fontSize: 12, fontWeight: 600, background: '#dbeafe', color: '#1565c0', padding: '2px 8px', borderRadius: 4, marginRight: 8 }}>{c.criteria_type}</span>
                        <span style={{ fontSize: 12, color: '#374151', fontFamily: 'monospace' }}>{c.criteria_value}</span>
                      </div>
                      <button onClick={() => deleteCriterion(c.id)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 12 }}>
                        <i className="fas fa-times"></i>
                      </button>
                    </div>
                  ))}
                  {!productDetail.criteria?.length && <div style={{ color: '#9ca3af', fontSize: 13 }}>No criteria defined</div>}
                </div>

                {/* Document Checklist */}
                <div style={{ background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>Document Checklist</div>
                    <button onClick={() => setShowDocModal(true)} style={{ padding: '4px 10px', background: '#0d7377', color: '#fff', border: 'none', borderRadius: 5, fontSize: 12, cursor: 'pointer' }}>+ Add</button>
                  </div>
                  {productDetail.documents?.map(doc => (
                    <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                      <div style={{ width: 20, fontSize: 11, color: '#9ca3af' }}>#{doc.order_no}</div>
                      <div style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{doc.doc_code}</div>
                      <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: doc.mandatory ? '#dcfce7' : '#f3f4f6', color: doc.mandatory ? '#16a34a' : '#6b7280', fontWeight: 600 }}>{doc.mandatory ? 'Mandatory' : 'Optional'}</span>
                      <button onClick={() => deleteDoc(doc.id)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 12 }}>
                        <i className="fas fa-times"></i>
                      </button>
                    </div>
                  ))}
                  {!productDetail.documents?.length && <div style={{ color: '#9ca3af', fontSize: 13 }}>No documents defined</div>}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Product Modal */}
      {showProductModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 12, width: 560, maxWidth: '95vw', maxHeight: '90vh', overflow: 'auto', padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ fontSize: 16, fontWeight: 600 }}>Add Loan Product</div>
              <button onClick={() => setShowProductModal(false)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#6b7280' }}>×</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={labelStyle}>Product Name *</label>
                <input style={inputStyle} value={productForm.product_name} onChange={e => setProductForm(f => ({ ...f, product_name: e.target.value }))} placeholder="e.g. HDFC Credila Unsecured Education Loan" />
              </div>
              <div>
                <label style={labelStyle}>Loan Type</label>
                <select style={inputStyle} value={productForm.loan_type} onChange={e => setProductForm(f => ({ ...f, loan_type: e.target.value }))}>
                  <option value="UNSECURED">UNSECURED</option>
                  <option value="SECURED">SECURED</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Processing Fee %</label>
                <input type="number" style={inputStyle} value={productForm.processing_fee_percent} onChange={e => setProductForm(f => ({ ...f, processing_fee_percent: e.target.value }))} placeholder="1.5" />
              </div>
              <div>
                <label style={labelStyle}>Min Amount (in paise)</label>
                <input type="number" style={inputStyle} value={productForm.min_amount_paise} onChange={e => setProductForm(f => ({ ...f, min_amount_paise: e.target.value }))} placeholder="e.g. 5000000 = ₹50,000" />
              </div>
              <div>
                <label style={labelStyle}>Max Amount (in paise)</label>
                <input type="number" style={inputStyle} value={productForm.max_amount_paise} onChange={e => setProductForm(f => ({ ...f, max_amount_paise: e.target.value }))} placeholder="e.g. 10000000 = ₹1L" />
              </div>
              <div>
                <label style={labelStyle}>Interest Range</label>
                <input style={inputStyle} value={productForm.interest_range} onChange={e => setProductForm(f => ({ ...f, interest_range: e.target.value }))} placeholder="e.g. 10.5% - 13.5%" />
              </div>
              <div>
                <label style={labelStyle}>Tenure Range</label>
                <input style={inputStyle} value={productForm.tenure_range} onChange={e => setProductForm(f => ({ ...f, tenure_range: e.target.value }))} placeholder="e.g. 5 - 15 years" />
              </div>
              <div style={{ gridColumn: '1/-1', display: 'flex', gap: 20 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                  <input type="checkbox" checked={productForm.collateral_required} onChange={e => setProductForm(f => ({ ...f, collateral_required: e.target.checked }))} />
                  Collateral Required
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                  <input type="checkbox" checked={productForm.coapp_required} onChange={e => setProductForm(f => ({ ...f, coapp_required: e.target.checked }))} />
                  Co-applicant Required
                </label>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowProductModal(false)} style={{ padding: '8px 16px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button onClick={createProduct} disabled={saving || !productForm.product_name} style={{ padding: '8px 16px', background: '#0d7377', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer', opacity: saving || !productForm.product_name ? 0.6 : 1 }}>
                {saving ? 'Creating...' : 'Create Product'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Criterion Modal */}
      {showCriterionModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 12, width: 440, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>Add Eligibility Criterion</div>
              <button onClick={() => setShowCriterionModal(false)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#6b7280' }}>×</button>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Criteria Type</label>
              <select style={inputStyle} value={criterionForm.criteria_type} onChange={e => setCriterionForm(f => ({ ...f, criteria_type: e.target.value }))}>
                {CRITERIA_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Value (number or JSON)</label>
              <textarea style={{ ...inputStyle, height: 80, resize: 'vertical' }} value={criterionForm.criteria_value} onChange={e => setCriterionForm(f => ({ ...f, criteria_value: e.target.value }))} placeholder='e.g. 600000 or {"min": 700}' />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowCriterionModal(false)} style={{ padding: '8px 16px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button onClick={addCriterion} disabled={saving} style={{ padding: '8px 16px', background: '#0d7377', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>Add Criterion</button>
            </div>
          </div>
        </div>
      )}

      {/* Doc Modal */}
      {showDocModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 12, width: 400, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>Add Document to Checklist</div>
              <button onClick={() => setShowDocModal(false)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#6b7280' }}>×</button>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Document Code / Name *</label>
              <input style={inputStyle} value={docForm.doc_code} onChange={e => setDocForm(f => ({ ...f, doc_code: e.target.value }))} placeholder="e.g. PASSPORT, BANK_STATEMENT_6M" />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Order Number</label>
              <input type="number" style={inputStyle} value={docForm.order_no} onChange={e => setDocForm(f => ({ ...f, order_no: e.target.value }))} placeholder="1" />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" checked={docForm.mandatory} onChange={e => setDocForm(f => ({ ...f, mandatory: e.target.checked }))} />
                Mandatory Document
              </label>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowDocModal(false)} style={{ padding: '8px 16px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button onClick={addDoc} disabled={saving || !docForm.doc_code} style={{ padding: '8px 16px', background: '#0d7377', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer', opacity: saving || !docForm.doc_code ? 0.6 : 1 }}>Add Document</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
