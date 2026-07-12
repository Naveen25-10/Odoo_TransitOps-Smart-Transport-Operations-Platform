const data = {
  fuelLogs: [
    { id: 1, vehicle: "Truck A-01", date: "2026-07-10", fuel: 120, cost: 360, odometer: 45000 },
    { id: 2, vehicle: "Van B-02", date: "2026-07-11", fuel: 80, cost: 240, odometer: 23100 }
  ],
  expenses: [
    { id: 1, vehicle: "Truck A-01", type: "Maintenance", amount: 500, date: "2026-07-09", remarks: "Oil change and tire rotation" },
    { id: 2, vehicle: "Van B-02", type: "Toll", amount: 25, date: "2026-07-11", remarks: "Highway toll charges" }
  ],
  profile: {
    name: "John Doe",
    email: "john@transitops.com",
    phone: "+1 234 567 8900",
    role: "Fleet Manager"
  },
  roles: [
    { 
      role: "Fleet Manager", 
      permissions: { Dashboard: true, Vehicles: true, Drivers: true, Trips: true, Maintenance: true, Fuel: true, Reports: true, Settings: true } 
    },
    { 
      role: "Dispatcher", 
      permissions: { Dashboard: true, Vehicles: true, Drivers: true, Trips: true, Maintenance: false, Fuel: false, Reports: false, Settings: false } 
    },
    { 
      role: "Safety Officer", 
      permissions: { Dashboard: true, Vehicles: false, Drivers: true, Trips: false, Maintenance: true, Fuel: false, Reports: true, Settings: false } 
    },
    { 
      role: "Financial Analyst", 
      permissions: { Dashboard: true, Vehicles: false, Drivers: false, Trips: false, Maintenance: false, Fuel: true, Reports: true, Settings: false } 
    }
  ],
  dashboard: {
    fuelEfficiency: "4.5 km/l",
    fleetUtilization: "85%",
    operationalCost: "$12,450",
    vehicleROI: "18%"
  },
  monthlyReports: [
    { month: 'Jan', fuel: 4000, expenses: 2400 },
    { month: 'Feb', fuel: 3000, expenses: 1398 },
    { month: 'Mar', fuel: 2000, expenses: 9800 },
    { month: 'Apr', fuel: 2780, expenses: 3908 },
    { month: 'May', fuel: 1890, expenses: 4800 },
    { month: 'Jun', fuel: 2390, expenses: 3800 },
    { month: 'Jul', fuel: 3490, expenses: 4300 }
  ],
  roi: [
    { vehicle: 'Truck A-01', roi: 25, utilization: 90 },
    { vehicle: 'Van B-02', roi: 18, utilization: 75 },
    { vehicle: 'Truck C-05', roi: 22, utilization: 85 }
  ]
};

module.exports = data;
