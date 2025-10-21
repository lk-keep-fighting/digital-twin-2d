// Schema and factories for device types and styles

export const DeviceTypes = {
  ProductionLine: 'ProductionLine',
  AGV: 'AGV',
  RGV: 'RGV',
  StackerCrane: 'StackerCrane',
  FlatWarehouse: 'FlatWarehouse',
};

export const Status = {
  normal: 'normal',
  offline: 'offline',
  fault: 'fault',
  blocked: 'blocked',
};

export const STATUS_COLORS = {
  normal: '#22c55e',
  offline: '#9ca3af',
  fault: '#ef4444',
  blocked: '#f59e0b',
};

export const DEFAULTS = {
  [DeviceTypes.ProductionLine]: { w: 160, h: 40 },
  [DeviceTypes.AGV]: { w: 40, h: 24 },
  [DeviceTypes.RGV]: { w: 40, h: 24 },
  [DeviceTypes.StackerCrane]: { w: 24, h: 120 },
  [DeviceTypes.FlatWarehouse]: { w: 200, h: 140 },
};

export function createElement(type, props = {}) {
  const d = DEFAULTS[type] || { w: 40, h: 40 };
  const el = {
    id: props.id || null,
    type,
    name: props.name || type,
    x: props.x ?? 0,
    y: props.y ?? 0,
    w: props.w ?? d.w,
    h: props.h ?? d.h,
    r: props.r ?? 0,
    z: props.z ?? 0,
    status: props.status || Status.normal,
    routeId: props.routeId || null,
    meta: props.meta || {},
  };
  return el;
}

export function getStatusColor(status) {
  return STATUS_COLORS[status] || STATUS_COLORS.normal;
}
