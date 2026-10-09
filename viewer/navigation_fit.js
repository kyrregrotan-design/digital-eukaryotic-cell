/* © Kyrre Grøtan. All rights reserved. Display bounds, not physical scale. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.DigitalCellNavigationFit = api;
})(globalThis, function () {
  'use strict';
  const dot = (a,b) => a.reduce((s,v,i)=>s+v*b[i],0);
  const cross = (a,b) => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  // Vertices of the conservative display envelope intersected with the saved
  // free-rectangle frustum. Deliberately cropped/off-panel content stays cropped.
  function clipBox(min,max,frustum) {
    const planes = [...frustum];
    for (let i=0;i<3;i++) {
      const n=[0,0,0]; n[i]=1; planes.push([...n,-min[i]]);
      planes.push(n.map(v=>-v).concat(max[i]));
    }
    const points=[];
    for(let i=0;i<planes.length;i++) for(let j=i+1;j<planes.length;j++) for(let k=j+1;k<planes.length;k++) {
      const rows=[planes[i],planes[j],planes[k]], n=rows.map(p=>p.slice(0,3));
      const c=[cross(n[1],n[2]),cross(n[2],n[0]),cross(n[0],n[1])], det=dot(n[0],c[0]);
      if(Math.abs(det)<1e-10) continue;
      const p=[0,1,2].map(axis=>-rows.reduce((s,r,h)=>s+r[3]*c[h][axis],0)/det);
      if(planes.every(r=>dot(r.slice(0,3),p)+r[3]>=-1e-7) &&
        !points.some(q=>q.every((v,h)=>Math.abs(v-p[h])<1e-7))) points.push(p);
    }
    return points;
  }
  function minimumDistance(points,pose,projection,rect,width,height,near,far=Infinity) {
    const sy=Math.sin(pose.yaw),cy=Math.cos(pose.yaw),sp=Math.sin(pose.pitch),cp=Math.cos(pose.pitch);
    const right=[cy,0,-sy],up=[-sp*sy,cp,-sp*cy],out=[cp*sy,sp,cp*cy];
    const edges=[2*rect[0]/width-1,2*(rect[0]+rect[2])/width-1,
      1-2*(rect[1]+rect[3])/height,1-2*rect[1]/height];
    const lx=edges[0]+projection[8],rx=edges[1]+projection[8],
      by=edges[2]+projection[9],ty=edges[3]+projection[9];
    if(!(lx<0&&rx>0&&by<0&&ty>0)) throw new TypeError('Free rectangle excludes the camera axis');
    let required=0,maximum=Infinity;
    for(const point of points) {
      const rel=point.map((v,i)=>v-pose.target[i]),x=dot(rel,right),y=dot(rel,up),z=dot(rel,out);
      required=Math.max(required,z+near,z+projection[0]*x/(x<0?lx:rx),z+projection[5]*y/(y<0?by:ty));
      maximum=Math.min(maximum,z+far);
    }
    const distance=Math.max(pose.dist,required);
    if(distance>maximum)throw new TypeError('Saved display bounds exceed the available projection depth');
    return distance;
  }
  return Object.freeze({clipBox,minimumDistance});
});
