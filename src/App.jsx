
import { useEffect, useState } from 'react'
import { apiRequest, login, logout } from './api'
import './App.css'

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('token'))
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  const [page, setPage] = useState('Dashboard')
  const [assets, setAssets] = useState([])
  const [categories, setCategories] = useState([])
  const [assignments, setAssignments] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Category form state
  const [categoryName, setCategoryName] = useState('')
  const [categorySaving, setCategorySaving] = useState(false)
  const [categoryError, setCategoryError] = useState('')
  const [categorySuccess, setCategorySuccess] = useState('')

  // Assignment form state
  const [selectedAssetId, setSelectedAssetId] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [assignmentSaving, setAssignmentSaving] = useState(false)
  const [returningId, setReturningId] = useState(null)
  const [assignmentError, setAssignmentError] = useState('')
  const [assignmentSuccess, setAssignmentSuccess] = useState('')

  function handleSessionError(err) {
    if (err.status === 401) {
      logout()
      setToken(null)
      setLoginError('Your session expired. Please log in again.')
    }
  }

  // Login
  async function handleLogin(event) {
    event.preventDefault()
    setLoginError('')
    setLoginLoading(true)

    try {
      const result = await login(username.trim(), password)
      const savedToken = result?.token || result?.accessToken

      if (!savedToken) {
        throw new Error('Login succeeded but no JWT token was returned.')
      }

      setToken(savedToken)
      setPassword('')
      setPage('Dashboard')
    } catch (err) {
      setLoginError(err.message || 'Login failed. Check your credentials.')
    } finally {
      setLoginLoading(false)
    }
  }

  // Load assets and categories after login
  useEffect(() => {
    if (!token) return

    let cancelled = false

    async function loadData() {
      setLoading(true)
      setError('')

      try {
        const [assetData, categoryData] = await Promise.all([
          apiRequest('/assets'),
          apiRequest('/categories'),
        ])

        if (cancelled) return

        setAssets(Array.isArray(assetData) ? assetData : [])
        setCategories(Array.isArray(categoryData) ? categoryData : [])
      } catch (err) {
        if (cancelled) return

        setError(err.message || 'Unable to load dashboard data.')
        handleSessionError(err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadData()

    return () => {
      cancelled = true
    }
  }, [token])

  // Load assignment history when Assignments page opens
  useEffect(() => {
    if (!token || page !== 'Assignments') return

    let cancelled = false

    async function loadAssignments() {
      setLoading(true)
      setAssignmentError('')

      try {
        const data = await apiRequest('/assignments')

        if (!cancelled) {
          setAssignments(Array.isArray(data) ? data : [])
        }
      } catch (err) {
        if (!cancelled) {
          setAssignmentError(err.message || 'Unable to load assignments.')
          handleSessionError(err)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadAssignments()

    return () => {
      cancelled = true
    }
  }, [token, page])

  // Add category
  async function handleCreateCategory(event) {
    event.preventDefault()

    const name = categoryName.trim()

    if (!name) {
      setCategoryError('Please enter a category name.')
      return
    }

    setCategorySaving(true)
    setCategoryError('')
    setCategorySuccess('')

    try {
      await apiRequest('/categories', {
        method: 'POST',
        body: JSON.stringify({ name }),
      })

      const categoryData = await apiRequest('/categories')

      setCategories(Array.isArray(categoryData) ? categoryData : [])
      setCategoryName('')
      setCategorySuccess('Category created successfully!')
    } catch (err) {
      setCategoryError(err.message || 'Unable to create category.')
      handleSessionError(err)
    } finally {
      setCategorySaving(false)
    }
  }

  // Create assignment
  async function handleCreateAssignment(event) {
    event.preventDefault()

    setAssignmentError('')
    setAssignmentSuccess('')

    if (!selectedAssetId || !employeeId) {
      setAssignmentError('Please select an asset and enter an employee ID.')
      return
    }

    const numericEmployeeId = Number(employeeId)

    if (!Number.isInteger(numericEmployeeId) || numericEmployeeId <= 0) {
      setAssignmentError('Enter a valid employee ID.')
      return
    }

    setAssignmentSaving(true)

    try {
      await apiRequest('/assignments', {
        method: 'POST',
        body: JSON.stringify({
          assetId: Number(selectedAssetId),
          employeeId: numericEmployeeId,
        }),
      })

      const [assignmentData, assetData] = await Promise.all([
        apiRequest('/assignments'),
        apiRequest('/assets'),
      ])

      setAssignments(Array.isArray(assignmentData) ? assignmentData : [])
      setAssets(Array.isArray(assetData) ? assetData : [])

      setSelectedAssetId('')
      setEmployeeId('')
      setAssignmentSuccess('Asset assigned successfully!')
    } catch (err) {
      setAssignmentError(err.message || 'Unable to assign asset.')
      handleSessionError(err)
    } finally {
      setAssignmentSaving(false)
    }
  }

  // Return assignment
  async function handleReturnAssignment(id) {
    setAssignmentError('')
    setAssignmentSuccess('')
    setReturningId(id)

    try {
      await apiRequest(`/assignments/${id}/return`, {
        method: 'POST',
      })

      const [assignmentData, assetData] = await Promise.all([
        apiRequest('/assignments'),
        apiRequest('/assets'),
      ])

      setAssignments(Array.isArray(assignmentData) ? assignmentData : [])
      setAssets(Array.isArray(assetData) ? assetData : [])
      setAssignmentSuccess('Asset returned successfully!')
    } catch (err) {
      setAssignmentError(err.message || 'Unable to return asset.')
      handleSessionError(err)
    } finally {
      setReturningId(null)
    }
  }

  // Logout
  function handleLogout() {
    logout()
    setToken(null)
    setPassword('')
    setUsername('')
    setLoginError('')
    setError('')
    setAssets([])
    setCategories([])
    setAssignments([])
    setCategoryName('')
    setCategoryError('')
    setCategorySuccess('')
    setSelectedAssetId('')
    setEmployeeId('')
    setAssignmentError('')
    setAssignmentSuccess('')
    setPage('Dashboard')
  }

  // Login screen
  if (!token) {
    return (
      <main className="app-container">
        <section className="login-card">
          <h1>IT Asset Tracker</h1>
          <p>Sign in to manage your equipment.</p>

          <form onSubmit={handleLogin}>
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Enter your username"
              autoComplete="username"
              required
            />

            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
            />

            {loginError && (
              <p className="error-banner" role="alert">
                {loginError}
              </p>
            )}

            <button type="submit" disabled={loginLoading}>
              {loginLoading ? 'Signing in...' : 'Log in'}
            </button>
          </form>
        </section>
      </main>
    )
  }

  const availableAssets = assets.filter(
    (asset) => asset.status === 'AVAILABLE'
  )

  return (
    <div className="layout">
      <aside className="sidebar">
        <h2>IT Asset Tracker</h2>
        <p className="sidebar-subtitle">Management System</p>

        {[
          'Dashboard',
          'Assets',
          'Categories',
          'Assignments',
          'Users',
        ].map((item) => (
          <button
            key={item}
            className={`nav-button ${page === item ? 'active' : ''}`}
            onClick={() => setPage(item)}
          >
            {item}
          </button>
        ))}

        <button className="logout-button" onClick={handleLogout}>
          Log out
        </button>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <h1>{page}</h1>
            <p>IT Asset &amp; Equipment Tracker</p>
          </div>
        </header>

        {loading && <p>Loading data...</p>}

        {error && (
          <p className="error-banner" role="alert">
            {error}
          </p>
        )}

        {/* DASHBOARD */}
        {page === 'Dashboard' && (
          <>
            <section className="welcome-banner">
              <h2>Welcome to your dashboard!</h2>
              <p>Manage and monitor your equipment in one place.</p>
            </section>

            <section className="stats-grid">
              <StatCard title="Total Assets" value={assets.length} />

              <StatCard
                title="Available Assets"
                value={availableAssets.length}
              />

              <StatCard
                title="Assigned Assets"
                value={assets.filter(
                  (asset) => asset.status === 'ASSIGNED'
                ).length}
              />

              <StatCard title="Categories" value={categories.length} />
            </section>

            <section className="panel">
              <h2>Recent Assets</h2>
              <AssetTable assets={assets.slice(0, 5)} />
            </section>
          </>
        )}

        {/* ASSETS */}
        {page === 'Assets' && (
          <section className="panel">
            <h2>All Assets</h2>
            <AssetTable assets={assets} />
          </section>
        )}

        {/* CATEGORIES */}
        {page === 'Categories' && (
          <>
            <section className="panel">
              <h2>Add New Category</h2>
              <p>Create a category for your equipment.</p>

              <form onSubmit={handleCreateCategory} className="category-form">
                <label htmlFor="categoryName">Category Name</label>

                <input
                  id="categoryName"
                  type="text"
                  value={categoryName}
                  onChange={(event) => {
                    setCategoryName(event.target.value)
                    setCategoryError('')
                    setCategorySuccess('')
                  }}
                  placeholder="Example: Laptops"
                  maxLength={100}
                  required
                />

                {categoryError && (
                  <p className="error-banner" role="alert">
                    {categoryError}
                  </p>
                )}

                {categorySuccess && (
                  <p className="success-message" role="status">
                    {categorySuccess}
                  </p>
                )}

                <button type="submit" disabled={categorySaving}>
                  {categorySaving ? 'Saving...' : 'Add Category'}
                </button>
              </form>
            </section>

            <section className="panel">
              <h2>All Categories ({categories.length})</h2>

              {categories.length === 0 ? (
                <p>No categories found. Add your first category above.</p>
              ) : (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Name</th>
                      </tr>
                    </thead>

                    <tbody>
                      {categories.map((category) => (
                        <tr key={category.id}>
                          <td>{category.id}</td>
                          <td>{category.name}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}

        {/* ASSIGNMENTS */}
        {page === 'Assignments' && (
          <>
            <section className="panel">
              <h2>Assign an Asset</h2>
              <p>Select an available asset and enter a STAFF employee ID.</p>

              <form
                onSubmit={handleCreateAssignment}
                className="category-form"
              >
                <label htmlFor="assetId">Available Asset</label>

                <select
                  id="assetId"
                  value={selectedAssetId}
                  onChange={(event) => setSelectedAssetId(event.target.value)}
                  required
                >
                  <option value="">Select an available asset</option>

                  {availableAssets.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.name} - {asset.serialNumber} (ID: {asset.id})
                    </option>
                  ))}
                </select>

                {availableAssets.length === 0 && (
                  <p>No available assets. Create an asset first.</p>
                )}

                <label htmlFor="employeeId">Employee ID</label>

                <input
                  id="employeeId"
                  type="number"
                  min="1"
                  value={employeeId}
                  onChange={(event) => setEmployeeId(event.target.value)}
                  placeholder="Example: 3"
                  required
                />

                {assignmentError && (
                  <p className="error-banner" role="alert">
                    {assignmentError}
                  </p>
                )}

                {assignmentSuccess && (
                  <p className="success-message" role="status">
                    {assignmentSuccess}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={assignmentSaving || availableAssets.length === 0}
                >
                  {assignmentSaving ? 'Assigning...' : 'Assign Asset'}
                </button>
              </form>
            </section>

            <section className="panel">
              <h2>Assignment History ({assignments.length})</h2>

              {assignmentError && (
                <p className="error-banner" role="alert">
                  {assignmentError}
                </p>
              )}

              {assignmentSuccess && (
                <p className="success-message" role="status">
                  {assignmentSuccess}
                </p>
              )}

              {assignments.length === 0 ? (
                <p>No assignment records found.</p>
              ) : (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Assignment ID</th>
                        <th>Asset</th>
                        <th>Serial Number</th>
                        <th>Employee</th>
                        <th>Assigned Date</th>
                        <th>Returned Date</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>

                    <tbody>
                      {assignments.map((assignment) => (
                        <tr key={assignment.id}>
                          <td>{assignment.id}</td>
                          <td>{assignment.assetName}</td>
                          <td>{assignment.serialNumber}</td>
                          <td>
                            {assignment.employeeUsername}
                            {' '}
                            (ID: {assignment.employeeId})
                          </td>
                          <td>
                            {assignment.assignedAt
                              ? new Date(assignment.assignedAt).toLocaleString()
                              : '-'}
                          </td>
                          <td>
                            {assignment.returnedAt
                              ? new Date(assignment.returnedAt).toLocaleString()
                              : '-'}
                          </td>
                          <td>
                            {assignment.returnedAt ? 'RETURNED' : 'ASSIGNED'}
                          </td>
                          <td>
                            {!assignment.returnedAt ? (
                              <button
                                type="button"
                                disabled={returningId === assignment.id}
                                onClick={() =>
                                  handleReturnAssignment(assignment.id)
                                }
                              >
                                {returningId === assignment.id
                                  ? 'Returning...'
                                  : 'Return'}
                              </button>
                            ) : (
                              'Completed'
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}

        {/* USERS */}
        {page === 'Users' && (
          <section className="panel">
            <h2>Users</h2>
            <p>User management will be connected next.</p>
          </section>
        )}
      </main>
    </div>
  )
}

function StatCard({ title, value }) {
  return (
    <article className="stat-card">
      <p>{title}</p>
      <strong>{value}</strong>
    </article>
  )
}

function AssetTable({ assets }) {
  if (assets.length === 0) {
    return <p>No assets found.</p>
  }

  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Serial Number</th>
            <th>Category</th>
            <th>Status</th>
          </tr>
        </thead>

        <tbody>
          {assets.map((asset) => (
            <tr key={asset.id}>
              <td>{asset.id}</td>
              <td>{asset.name}</td>
              <td>{asset.serialNumber}</td>
              <td>
                {asset.categoryName ?? asset.categoryId ?? asset.category?.name}
              </td>
              <td>{asset.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
