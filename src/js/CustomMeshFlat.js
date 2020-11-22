var CustomMesh = {
  
  ////////////////////////////////////////////////////////////////////////////////////
  // RANDOM SHAPE
  ////////////////////////////////////////////////////////////////////////////////////

  flatshadeGeometry : function(geom){
    geom.computeFaceNormals();
    for ( var i = 0; i < geom.faces.length; i ++ ) {
      geom.faces[ i ].vertexNormals = [];
    }
    geom = new THREE.BufferGeometry().fromGeometry( geom );
  },

  ////////////////////////////////////////////////////////////////////////////////////
  // PLANE
  ////////////////////////////////////////////////////////////////////////////////////

  PlaneMesh : function(w,d,s,color){
     var mat = new THREE.MeshLambertMaterial({ 
        color: color
      });  

    var geom = new THREE.PlaneGeometry( w, d, s, s );
    CustomMesh.flatshadeGeometry(geom);
    var mesh = new THREE.Mesh(geom, mat);
    return mesh;
  },
}


