class Grid_Patch extends Shape                          // A deformed grid of rows and columns. A tesselation of triangles connects the points, by generating a certain 
{  constructor( rows, columns, next_row_function, next_column_function, texture_coord_range = [ [ 0, rows ], [ 0, columns ] ]  )      // predictable pattern of indices.
    { super();                                                                     // Two callbacks allow you to dynamically define how to reach the next row or column.
      let points = [];
      for( let r = 0; r <= rows; r++ ) 
      { points.push( new Array( columns+1 ) );                                                  // Allocate a 2D array
        points[ r ][ 0 ] = next_row_function( r/rows, points[ r-1 ] && points[ r-1 ][ 0 ] );    // Use next_row_function to generate the start point of each row.
      }                                                                                         //   Include the previous point if it existed.      
      for(   let r = 0; r <= rows;    r++ )
        for( let c = 0; c <= columns; c++ )
        { if( c > 0 ) points[r][ c ] = next_column_function( c/columns, points[r][ c-1 ], r/rows );           // From those, use next_column function to generate the remaining points.
      
          this.positions.push( points[r][ c ] );        
          const a1 = c/columns, a2 = r/rows, x_range = texture_coord_range[0], y_range = texture_coord_range[1];
          this.texture_coords.push( Vec.of( ( a1 )*x_range[1] + ( 1-a1 )*x_range[0], ( a2 )*y_range[1] + ( 1-a2 )*y_range[0] ) );    // Interpolate texture coords from a range.
        }
      for(   let r = 0; r <= rows;    r++ )                                                   // Generate normals by averaging the cross products of all defined neighbor pairs.
        for( let c = 0; c <= columns; c++ )
        { let curr = points[r][c], neighbors = new Array(4), normal = Vec.of( 0,0,0 );          
          for( let [ i, dir ] of [ [ -1,0 ], [ 0,1 ], [ 1,0 ], [ 0,-1 ] ].entries() )         // Store each neighbor by rotational order.
            neighbors[i] = points[ r + dir[1] ] && points[ r + dir[1] ][ c + dir[0] ];        // Leave "undefined" in the array wherever we hit a boundary.
          
          for( let i = 0; i < 4; i++ )                                                        // Cross pairs of neighbors, proceeding the same rotational direction through the pairs.
            if( neighbors[i] && neighbors[ (i+1)%4 ] ) normal = normal.plus( neighbors[i].minus( curr ).cross( neighbors[ (i+1)%4 ].minus( curr ) ) );          
          normal.normalize();                                                                 // Normalize the sum to get the average vector.
          
          if( normal.every( x => x == x ) && normal.norm() > .01 )  this.normals.push( Vec.from( normal ) );    // Store the normal if it's valid (not NaN or zero length)
          else                                                      this.normals.push( Vec.of( 0,0,1 )    );    // Otherwise use a default.
        }
      for( let i = 0; i < this.normals.length; i++ )
      { if( this.normals[i].norm() > 0 ) break;
        this.normals[i] = first_valid_normal;
      }        
        
      for( var h = 0; h < rows; h++ )             // Generate a sequence like this (if #columns is 10):  "1 11 0  11 1 12  2 12 1  12 2 13  3 13 2  13 3 14  4 14 3..." 
        for( var i = 0; i < 2 * columns; i++ )
          for( var j = 0; j < 3; j++ )
            this.indices.push( h * ( columns + 1 ) + columns * ( ( i + ( j % 2 ) ) % 2 ) + ( ~~( ( j % 3 ) / 2 ) ? 
                                   ( ~~( i / 2 ) + 2 * ( i % 2 ) )  :  ( ~~( i / 2 ) + 1 ) ) );
    }
  static sample_array( array, ratio )                                           // Optional.  In an array of points, intepolate the pair of points that our progress ratio falls between.
    { const frac = ratio * ( array.length - 1 ), alpha = frac - Math.floor( frac );
      return array[ Math.floor( frac ) ].mix( array[ Math.ceil( frac ) ], alpha );
    }
}
  
class Surface_Of_Revolution extends Grid_Patch
  // SURFACE OF REVOLUTION: Produce a curved "sheet" of triangles with rows and columns.  Begin with an input array of points, defining a 1D path curving through 3D space -- 
  // now let each point be a row.  Sweep that whole curve around the Z axis in equal steps, stopping and storing new points along the way; let each step be a column.  Now we
  // have a flexible "generalized cylinder" spanning an area until total_curvature_angle.  
{ constructor( rows, columns, points, texture_coord_range, total_curvature_angle = 2*Math.PI )
    { super( rows, columns, i => Grid_Patch.sample_array( points, i ), (j,p) => Mat4.rotation( total_curvature_angle/columns, Vec.of( 0,0,1 ) ).times(p.to4(1)).to3(), texture_coord_range );
    }
}    
  
class Regular_2D_Polygon extends Surface_Of_Revolution  // Approximates a flat disk / circle
  { constructor( rows, columns ) { super( rows, columns, [ ...Vec.cast( [0, 0, 0], [1, 0, 0] ) ] ); 
                                   this.normals = this.normals.map( x => Vec.of( 0,0,1 ) );
                                   this.texture_coords.forEach( (x, i, a) => a[i] = this.positions[i].map( x => x/2 + .5 ).slice(0,2) ); } }
  
class Cylindrical_Tube extends Surface_Of_Revolution    // An open tube shape with equally sized sections, pointing down Z locally.    
  { constructor( rows, columns, texture_range ) 
    { super( rows, columns, [ ...Vec.cast( [1, 0, .5], [1, 0, -.5] ) ], texture_range ); } }

class Cone_Tip extends Surface_Of_Revolution            // Note:  Curves that touch the Z axis degenerate from squares into triangles as they sweep around
  { constructor( rows, columns, texture_range ) 
    { super( rows, columns, [ ...Vec.cast( [0, 0, 1],  [1, 0, -1]  ) ], texture_range ); } }

class Torus extends Shape
  { constructor( rows, columns, texture_range )  
      { super();      
        let circle_points = Array( rows ).fill( Vec.of( .5,0,0 ) );   
        circle_points = circle_points.map( (x,i,a) => Mat4.rotation( i/(a.length-1) * 2*Math.PI, Vec.of( 0,-1,0 ) ).times( x.to4(1) ).to3() );
        circle_points = circle_points.map( (x,i,a) => Mat4.translation([ -.75,0,0 ]).times( x.to4(1) ).to3() );
      
        Surface_Of_Revolution.prototype.insert_transformed_copy_into( this, [ rows, columns, circle_points, texture_range ] );         
      } }
      
class Grid_Sphere extends Shape           // With lattitude / longitude divisions; this means singularities are at 
  { constructor( rows, columns, texture_range )             // the mesh's top and bottom.  Subdivision_Sphere is a better alternative.
      { super();            
        let semi_circle_points = Array( rows ).fill( Vec.of( 0,0,1 ) );
        semi_circle_points = semi_circle_points.map( (x,i,a) => Mat4.rotation( i/(a.length-1) * Math.PI, Vec.of( 0,1,0 ) ).times( x.to4(1) ).to3() );
        
        Surface_Of_Revolution.prototype.insert_transformed_copy_into( this, [ rows, columns, semi_circle_points, texture_range ] );     
      } }
      
class Closed_Cone extends Shape     // Combine a cone tip and a regular polygon to make a closed cone.
  { constructor( rows, columns, texture_range ) 
      { super();
        Cone_Tip          .prototype.insert_transformed_copy_into( this, [ rows, columns, texture_range ]);    
        Regular_2D_Polygon.prototype.insert_transformed_copy_into( this, [ 1, columns ], Mat4.rotation( Math.PI, Vec.of(0, 1, 0) ).times( Mat4.translation([ 0, 0, 1 ]) ) ); } }

class Rounded_Closed_Cone extends Surface_Of_Revolution   // An alternative without two separate sections
  { constructor( rows, columns, texture_range ) 
    { super( rows, columns, [ ...Vec.cast( [0, 0, 1], [1, 0, -1], [0, 0, -1] ) ], texture_range ) ; } }

class Capped_Cylinder extends Shape   // Combine a tube and two regular polygons to make a closed cylinder.  Flat shade this to make a prism, where #columns = #sides.
  { constructor( rows, columns, texture_range )
      { super();
        Cylindrical_Tube  .prototype.insert_transformed_copy_into( this, [ rows, columns, texture_range ] );
        Regular_2D_Polygon.prototype.insert_transformed_copy_into( this, [ 1, columns ],                                             Mat4.translation([ 0, 0, .5 ]) );
        Regular_2D_Polygon.prototype.insert_transformed_copy_into( this, [ 1, columns ], Mat4.rotation( Math.PI, Vec.of(0, 1, 0) ).times( Mat4.translation([ 0, 0, .5 ]) ) ); } }
  
class Rounded_Capped_Cylinder extends Surface_Of_Revolution   // An alternative without three separate sections
  { constructor ( rows, columns, texture_range ) 
    { super( rows, columns, [ ...Vec.cast( [0, 0, .5], [1, 0, .5], [1, 0, -.5], [0, 0, -.5] ) ], texture_range ); } } 
  
class Axis_Arrows extends Shape   // An axis set made out of a lot of various primitives.
{ constructor()
    { super();
      var stack = [];       
      Subdivision_Sphere.prototype.insert_transformed_copy_into( this, [ 3 ], Mat4.rotation( Math.PI/2, Vec.of( 0,1,0 ) ).times( Mat4.scale([ .25, .25, .25 ]) ) );
      this.drawOneAxis( Mat4.identity(),                                                            [[  0 ,.33 ], [ 0,1 ]] );
      this.drawOneAxis( Mat4.rotation(-Math.PI/2, Vec.of(1,0,0)).times( Mat4.scale([  1, -1, 1 ])), [[ .34,.66 ], [ 0,1 ]] );
      this.drawOneAxis( Mat4.rotation( Math.PI/2, Vec.of(0,1,0)).times( Mat4.scale([ -1,  1, 1 ])), [[ .67, 1  ], [ 0,1 ]] ); 
    }
  drawOneAxis( transform, tex )    // Use a different texture coordinate range for each of the three axes, so they show up differently.
    { Closed_Cone     .prototype.insert_transformed_copy_into( this, [ 4, 10, tex ], transform.times( Mat4.translation([   0,   0,  2 ]) ).times( Mat4.scale([ .25, .25, .25 ]) ), 0 );
      Cube            .prototype.insert_transformed_copy_into( this, [ ],            transform.times( Mat4.translation([ .95, .95, .45]) ).times( Mat4.scale([ .05, .05, .45 ]) ), 0 );
      Cube            .prototype.insert_transformed_copy_into( this, [ ],            transform.times( Mat4.translation([ .95,   0, .5 ]) ).times( Mat4.scale([ .05, .05, .4  ]) ), 0 );
      Cube            .prototype.insert_transformed_copy_into( this, [ ],            transform.times( Mat4.translation([   0, .95, .5 ]) ).times( Mat4.scale([ .05, .05, .4  ]) ), 0 );
      Cylindrical_Tube.prototype.insert_transformed_copy_into( this, [ 7, 7,  tex ], transform.times( Mat4.translation([   0,   0,  1 ]) ).times( Mat4.scale([  .1,  .1,  2  ]) ), 0 );
    }
}

class Fake_Bump_Map extends Phong_Model  // Overrides Phong_Model except for one thing                  
{ fragment_glsl_code()           // ********* FRAGMENT SHADER *********
    { return `
        uniform sampler2D texture;          //  Like real bump mapping, but with no separate file for the bump map (instead we'll
        void main()                         //  re-use the colors of the original picture file to disturb the normal vectors)
        {
          if( GOURAUD || COLOR_NORMALS )    // Bypass Smooth "Phong" shading if, as in Gouraud case, we already have final colors to smear (interpolate) across vertices.
          {
            gl_FragColor = VERTEX_COLOR;
            return;
          }                                 // Calculate Smooth "Phong" Shading (not to be confused with the Phong Reflection Model).  As opposed to Gouraud Shading.
          vec4 tex_color = texture2D( texture, f_tex_coord );                         // Use texturing as well
          vec3 bumped_N  = normalize( N + tex_color.rgb - .5*vec3(1,1,1) );           // Slightly disturb normals based on sampling the same texture
          gl_FragColor      = tex_color * ( USE_TEXTURE ? ambient : 0.0 ) + vec4( shapeColor.xyz * ambient, USE_TEXTURE ? shapeColor.w * tex_color.w : shapeColor.w ) ;
          gl_FragColor.xyz += phong_model_lights( bumped_N );
        }`;
    }
}
  
class Surfaces_Demo extends Scene_Component
{ constructor( context )
    { super( context );
    
      let square_array = Vec.cast( [ 1,0,-1 ], [ 0,1,-1 ], [ -1,0,-1 ], [ 0,-1,-1 ], [ 1,0,-1 ] ),               // Some helper arrays of points located along
            star_array = Array(19).fill( Vec.of( 1,0,-1 ) ), circle_array = Array(40).fill( Vec.of( 1,0,-1 ) );  // curves.  We'll extrude these into surfaces.
      circle_array = circle_array.map( (x,i,a) => Mat4.rotation( i/(a.length-1) * 2*Math.PI, Vec.of( 0,0,1 ) ).times( x.to4(1) ).to3() );
      star_array   =   star_array.map( (x,i,a) => Mat4.rotation( i/(a.length-1) * 2*Math.PI, Vec.of( 0,0,1 ) ).times( Mat4.translation([ (i%2)/2,0,0 ]) ).times( x.to4(1) ).to3() );
      
      let sin_rows_func       =      i  => { return Vec.of( .5 + Math.sin(777*i)/4, 2-4*i, 0 ) },                                   // Different callbacks for telling Grid_Patch 
          sin_columns_func    = ( j,p ) => { return Mat4.translation([ Math.sin(777*j)/4,0,4/30    ]).times( p.to4(1) ).to3() },    // how it chould advance to the next row/column.  
          rotate_columns_func = ( j,p ) => { return Mat4.rotation( .1*j*Math.PI, Vec.of( 0,1,0 )    ).times( p.to4(1) ).to3() },
          sample_square_func  =      i  => { return Grid_Patch.sample_array( square_array, i ) },
          sample_star_func    =      i  => { return Grid_Patch.sample_array( star_array,   i ) },
          sample_circle_func  =      i  => { return Grid_Patch.sample_array( circle_array, i ) },          
          sample_two_arrays   = (j,p,i) => { return Mat4.translation([0,0,2*j]).times( sample_star_func(i).mix( sample_circle_func(i), j ).to4(1) ).to3() },
          sample_two_arrays2  = (j,p,i) => { return Mat4.rotation( .5*j*Math.PI, Vec.of( 1,1,1 ) ).times( 
                                                    Mat4.translation([0,0,2*j]).times( sample_star_func(i).mix( sample_square_func(i), j ).to4(1) ) ).to3() },
          line_rows_func      = ( i,p ) => { return p ? Mat4.translation([0,i/50,0]).times( p.to4(1) ).to3() :  Vec.of( .01,-.05,-.1 ) },
          transform_cols_func = (j,p,i) => { return Mat4.rotation( Math.PI/8, Vec.of( 0,0,1 ) ).times( Mat4.scale([ 1.1,1.1,1.1 ])).times( Mat4.translation([ 0,0,.005 ]))
                                                      .times( p.to4(1) ).to3() };
      var shapes = { good_sphere : new Subdivision_Sphere( 4 ),                                           // A sphere made of nearly equilateral triangles / no singularities
                     vase        : new Grid_Patch( 30, 30, sin_rows_func, rotate_columns_func,   [[0,1],[0,1]] ),
                     box         : new Cube(),
                     ghost       : new Grid_Patch( 36, 10, sample_star_func, sample_two_arrays,  [[0,1],[0,1]] ),
                     shell       : new Grid_Patch( 10, 40, line_rows_func, transform_cols_func,  [[0,5],[0,1]] ),
                     waves       : new Grid_Patch( 30, 30, sin_rows_func, sin_columns_func,      [[0,1],[0,1]] ),
                     shell2      : new Grid_Patch( 30, 30, sample_star_func, sample_two_arrays2, [[0,1],[0,1]] ),
                     tube        : new Cylindrical_Tube  ( 10, 10, [[0,1],[0,1]] ),
                     open_cone   : new Cone_Tip          (  3, 10, [[0,1],[0,1]] ),
                     donut       : new Torus             ( 15, 15 ),
                     gem2        : new ( Torus             .prototype.make_flat_shaded_version() )( 20, 20 ),
                     bad_sphere  : new Grid_Sphere       ( 10, 10 ),                                            // A sphere made of rows and columns, with singularities
                     septagon    : new Regular_2D_Polygon(  2,  7 ),
                     cone        : new Closed_Cone       ( 4, 20, [[0,1],[0,1]] ),                       // Cone.  Useful.
                     capped      : new Capped_Cylinder   ( 4, 12, [[0,1],[0,1]] ),                       // Cylinder.  Also useful.
                     axis        : new Axis_Arrows(),                                                    // Axis.  Draw them often to check your current basis.
                     prism       : new ( Capped_Cylinder   .prototype.make_flat_shaded_version() )( 10, 10, [[0,1],[0,1]] ),
                     gem         : new ( Subdivision_Sphere.prototype.make_flat_shaded_version() )(  2     ),
                     swept_curve : new Surface_Of_Revolution( 10, 10, [ ...Vec.cast( [2, 0, -1], [1, 0, 0], [1, 0, 1], [0, 0, 2] ) ], [ [ 0, 1 ], [ 0, 7 ] ], Math.PI/3 ),
                   };
      this.submit_shapes( context, shapes );
      Object.assign( context.globals.graphics_state, { camera_transform: Mat4.translation([ -2,2,-15 ]), projection_transform: Mat4.perspective( Math.PI/4, context.width/context.height, .1, 1000 ) } );
      Object.assign( this, { shader: context.get_instance( Fake_Bump_Map ), textures: [], gallery: false, patch_only: false, revolution_only: false } );
      for( let filename of [ "/assets/rgb.jpg", "/assets/stars.png", "/assets/earth.gif", "/assets/text.png" ] ) this.textures.push( context.get_instance( filename ) ); this.textures.push( undefined );
    }
  display( graphics_state )
    { let model_transform = Mat4.identity(), t = graphics_state.animation_time / 1000;
      graphics_state.lights = [ new Light( Vec.of( 1,1,0, 0 ).normalized(), Color.of(  1, .5, .5, 1 ), 100000000 ),
                                new Light( Vec.of( 0,1,0, 0 ).normalized(), Color.of( .5,  1, .5, 1 ), 100000000 ) ];
                                  
      for( var i = 0; i < 5; i++ )           // Draw some moving worm-like sequences of shapes.  Keep the matrix state from the previous one to draw the next one attached at the end.                                
      { let j = i;
        for( let key in this.shapes )
        { j++;
          if( this.patch_only      &&    this.shapes[ key ].constructor.name != "Grid_Patch"   ) continue;    // Filter some shapes out when those buttons have been pressed.
          if( this.revolution_only && !( this.shapes[ key ] instanceof Surface_Of_Revolution ) ) continue;
          
          let funny_function_of_time = t/5 + j*j*Math.cos( t/10 )/50,
                     random_material = this.shader.material( Color.of( (j % 6)/10, (j % 5)/10, (j % 4)/10, 1 ), .4, 1, 1, 40, this.textures[0] )
              
          model_transform.post_multiply( Mat4.rotation( funny_function_of_time, Vec.of(j%3 == 0, j%3 == 1, j%3 == 2) ) );   // Irregular motion
          if( this.gallery ) model_transform.pre_multiply ( Mat4.translation([ 3, 0,0 ]) );   // Gallery mode:  Switch the rotation/translation order to line up the shapes.
          else               model_transform.post_multiply( Mat4.translation([ 0,-3,0 ]) );
          this.shapes[ key ].draw( graphics_state, model_transform, random_material );        //  Draw the current shape in the list    
        }
        model_transform.post_multiply( Mat4.rotation( .5, Vec.of(0, 0, 1) ) );
      }      
    }
  make_control_panel()   // This function of a scene sets up its keyboard shortcuts.
    { this.key_triggered_button( "Next Texture",                   "t", function() { this.textures.push( this.textures.shift() )    },  "red" ); this.new_line();
      this.key_triggered_button( "Gallery View",                   "g", function() { this.gallery ^= 1;                             }, "blue" ); this.new_line();
      this.key_triggered_button( "Revolution Surfaces Only", "shift+S", function() { this.revolution_only = 1; this.patch_only = 0; }         ); this.new_line();
      this.key_triggered_button( "Custom Patches Only",      "shift+C", function() { this.revolution_only = 0; this.patch_only = 1; }         ); this.new_line();
      this.key_triggered_button( "All Shapes",               "shift+A", function() { this.revolution_only = 0; this.patch_only = 0; }         );
    }
  show_explanation( document_element )
    { document_element.innerHTML += "Welcome to the Surfaces Demo!  This is a demonstration of how to make a diverse set of shapes using the least amount of code. <br>"
                                 +  "Use the movement controls below to explore the scene.  You may find it easier to do this in gallery mode, entered by pressing "
                                 +  "g or the blue button below.  Press t to cycle through the loaded texture images.<br>"
                                 +  "A cone and cylinder are among the simplest and most useful new shapes.  Also available is a set of axis arrows that can be drawn anytime "
                                 +  "that you want to check where and how long your current coordinate axes are.  Draw it in a neutral color with the \"rgb.jpg\" "
                                 +  "texture image and the axes will become identifiable by color - XYZ maps to red, green, blue.<br>"
                                 +  "Most of these shapes are made using tiny code due to the help of two classes:  Grid_Patch and Surface_Of_Revolution (a special case "
                                 +  "of Grid_Patch).  Grid_Patch works by generating a tesselation of triangles arranged in rows and columns, and produes a deformed grid "
                                 +  "by doing user-defined steps to reach the next row or column. <br>"
                                 +  "All of these shapes are generated as a single vertex array each.  Building them that way, even with shapes like the axis arrows that "
                                 +  "are compounded together out of many shapes, speeds up your graphics program considerably.";
    }
}