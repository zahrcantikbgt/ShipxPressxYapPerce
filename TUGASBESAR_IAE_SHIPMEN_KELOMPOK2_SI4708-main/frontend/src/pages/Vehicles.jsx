import { useQuery, useMutation, gql } from '@apollo/client';
import { useState } from 'react';
import { Plus, Truck, Gauge, Edit, Trash2, X, Eye } from 'lucide-react';

/* ================= GRAPHQL ================= */

const GET_VEHICLES = gql`
  query {
    vehicles {
      vehicle_id
      V_type
      license_plate
      capacity
      status
    }
  }
`;

const CREATE_VEHICLE = gql`
  mutation CreateVehicle(
    $V_type: String!
    $license_plate: String!
    $capacity: Float!
    $status: String!
  ) {
    createVehicle(
      V_type: $V_type
      license_plate: $license_plate
      capacity: $capacity
      status: $status
    ) {
      vehicle_id
    }
  }
`;

const UPDATE_VEHICLE = gql`
  mutation UpdateVehicle(
    $id: ID!
    $V_type: String!
    $license_plate: String!
    $capacity: Float!
    $status: String!
  ) {
    updateVehicle(
      id: $id
      V_type: $V_type
      license_plate: $license_plate
      capacity: $capacity
      status: $status
    ) {
      vehicle_id
    }
  }
`;

const DELETE_VEHICLE = gql`
  mutation DeleteVehicle($id: ID!) {
    deleteVehicle(id: $id)
  }
`;

/* ================= COMPONENT ================= */

const Vehicles = () => {
  const { data, loading, error, refetch } = useQuery(GET_VEHICLES);
  const [createVehicle] = useMutation(CREATE_VEHICLE);
  const [updateVehicle] = useMutation(UPDATE_VEHICLE);
  const [deleteVehicle] = useMutation(DELETE_VEHICLE);

  const [showModal, setShowModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);

  const [formData, setFormData] = useState({
    V_type: 'Truck',
    license_plate: '',
    capacity: '',
    status: 'available',
  });

  /* ================= HANDLER ================= */

  const resetForm = () => {
    setFormData({
      V_type: 'Truck',
      license_plate: '',
      capacity: '',
      status: 'available',
    });
    setEditingVehicle(null);
    setShowModal(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.license_plate || !formData.capacity) {
      alert('License plate & capacity wajib diisi');
      return;
    }

    const payload = {
      V_type: formData.V_type,
      license_plate: formData.license_plate,
      capacity: parseFloat(formData.capacity),
      status: formData.status,
    };

    try {
      if (editingVehicle) {
        await updateVehicle({
          variables: {
            id: editingVehicle.vehicle_id,
            ...payload,
          },
        });
      } else {
        await createVehicle({ variables: payload });
      }

      resetForm();
      refetch();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleEdit = (v) => {
    setEditingVehicle(v);
    setFormData({
      V_type: v.V_type,
      license_plate: v.license_plate,
      capacity: String(v.capacity),
      status: v.status.toLowerCase(),
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this vehicle?')) return;
    await deleteVehicle({ variables: { id } });
    refetch();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-700';
      case 'in_use':
        return 'bg-blue-100 text-blue-700';
      case 'maintenance':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error</p>;

  /* ================= RENDER ================= */

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Vehicles</h2>
        <button
          onClick={() => setShowModal(true)}
          className="bg-orange text-white px-5 py-2 rounded-xl flex items-center gap-2"
        >
          <Plus size={18} /> Add Vehicle
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {data.vehicles.map((v) => (
          <div key={v.vehicle_id} className="bg-white p-5 rounded-xl shadow">
            <div className="flex justify-between">
              <h3 className="font-bold">{v.license_plate}</h3>
              <div className="flex gap-2">
                <Edit size={16} onClick={() => handleEdit(v)} className="cursor-pointer text-blue-600" />
                <Trash2 size={16} onClick={() => handleDelete(v.vehicle_id)} className="cursor-pointer text-red-600" />
              </div>
            </div>

            <p className="text-sm text-gray-600">{v.V_type}</p>
            <p className="mt-2 flex items-center gap-1">
              <Gauge size={14} /> {v.capacity} kg
            </p>

            <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs ${getStatusColor(v.status.toLowerCase())}`}>
              {v.status}
            </span>
          </div>
        ))}
      </div>

      {/* ================= MODAL ================= */}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-xl w-full max-w-md">
            <div className="flex justify-between mb-4">
              <h3 className="text-xl font-bold">
                {editingVehicle ? 'Edit Vehicle' : 'Add Vehicle'}
              </h3>
              <X onClick={resetForm} className="cursor-pointer" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <select
                value={formData.V_type}
                onChange={(e) => setFormData({ ...formData, V_type: e.target.value })}
                className="w-full border p-2 rounded"
              >
                <option>Truck</option>
                <option>Van</option>
                <option>Motorcycle</option>
              </select>

              <input
                placeholder="License Plate"
                value={formData.license_plate}
                onChange={(e) => setFormData({ ...formData, license_plate: e.target.value })}
                className="w-full border p-2 rounded"
              />

              <input
                type="number"
                placeholder="Capacity"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                className="w-full border p-2 rounded"
              />

              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full border p-2 rounded"
              >
                <option value="available">Available</option>
                <option value="in_use">In Use</option>
                <option value="maintenance">Maintenance</option>
              </select>

              <button className="w-full bg-orange text-white py-2 rounded">
                {editingVehicle ? 'Update' : 'Create'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Vehicles;