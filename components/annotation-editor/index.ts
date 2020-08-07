import zrender from 'zrender';

export interface AnnotationEditorOptions {
  imgUrl: string;
  mode?: AnnotationEditorMode;
}

export interface OptionalAnnotationEditorOptions {
  imgUrl?: string;
  mode?: AnnotationEditorMode;
}

export interface ObjectData {
  group: {
    position: [number, number],
    scale: [number, number],
    rotation: number,
  };
  geometry: {
    type: 'image' | 'rect' | 'polyline',
    style: { [name: string ]: any },
    shape: { [name: string ]: any },
    position: [number, number],
    scale: [number, number],
    rotation: number,
  }
}

export enum AnnotationEditorMode {
  Rect = 1,
  Polyline,
  DragImage,
  Edit,
  Move
}

export default class AnnotationEditor {
  public instance: any;
  public options: AnnotationEditorOptions | {} = {};
  public workspace: any;
  public image: any;
  public objects: any[] = [];

  constructor(public mounted: string | HTMLElement) {
    const root = this.getNode(mounted);
    if (root) {
      this.instance = zrender.init(root, {
        width: root.offsetWidth,
        height: root.offsetHeight
      });
      this.workspace = new zrender.Group({
        position: [0, 0],
        scale: [1, 1]
      });
      this.instance.add(this.workspace);
    }
  }

  private getNode(dom: string | HTMLElement): HTMLElement | null {
    if (typeof dom === 'string') {
      return document.querySelector(dom);
    } else {
      return dom;
    }
  }

  private loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.src = url;
      image.onload = () => {
        resolve(image);
      };
      image.onerror = () => {
        reject();
      };
    });
  }

  public async init(options: AnnotationEditorOptions) {
    this.options = options;
    const { imgUrl, mode } = options;

    const image = await this.drawImage(imgUrl);
    this.image = image;
    this.workspace.add(image);

    this.switchMode(mode);
  }

  public async drawImage(url: string) {
    const image = await this.loadImage(url);
    const geo = new zrender.Image({
      style: {
        x: 0,
        y: 0,
        width: image.width,
        height: image.height,
        image: url
      }
    });
    return geo;
  }

  private computedShapeXyRange(geo: any) {
    const shape = geo.shape;
    let range = {
      xRange: [0, 0],
      yRange: [0, 0]
    };

    switch (geo.type) {
      case 'rect': {
        range = {
          xRange: [shape.x, shape.x + shape.width],
          yRange: [shape.y, shape.y + shape.height]
        };
        break;
      }
      case 'ellipse': {
        range =  {
          xRange: [shape.cx - shape.rx, shape.cx + shape.rx],
          yRange: [shape.cy - shape.ry, shape.cy + shape.ry]
        };
        break;
      }
      case 'image': {
        const style = geo.style;
        range = {
          xRange: [style.x, style.x + style.width],
          yRange: [style.y, style.y + style.height]
        };
        break;
      }
      case 'polyline': {
        const points: Array<[number, number]> = geo.shape.points;
        if (points.length > 0) {
          points.forEach(([x, y], index) => {
            if (index === 0) {
              range = {
                xRange: [x, x],
                yRange: [y, y]
              }
            } else {
              range = {
                xRange: [Math.min(range.xRange[0], x), Math.max(range.xRange[1], x)],
                yRange: [Math.min(range.yRange[0], y), Math.max(range.yRange[1], y)]
              }
            }
          })
        }
        break;
      }
    }
    return {
      xRange: range.xRange.sort((a, b) => a - b),
      yRange: range.yRange.sort((a, b) => a - b)
    }
  }

  private switchModeHooks: Array<() => void> = [];

  public switchMode(mode: AnnotationEditorMode | undefined) {
    const on = (name: string, handler: Function) => {
      this.instance.on(name, handler);
      this.switchModeHooks.push(() => {
        this.instance.off(name, handler);
      });
    };

    this.workspace.attr({
      draggable: false
    });
    this.switchModeHooks.forEach(handler => {
      handler();
    });
    this.switchModeHooks = [];

    switch(mode) {
      case AnnotationEditorMode.DragImage: {
        this.workspace.attr({
          draggable: true
        });
        break;
      }
      case AnnotationEditorMode.Rect: {
        const mousedown = (e: any) => {
          const { xRange, yRange } = this.computedShapeXyRange(this.image);
          const [offsetX, offsetY] = this.workspace.transformCoordToLocal(e.offsetX, e.offsetY);

          if (offsetX < xRange[0] || offsetX > xRange[1] || offsetY < yRange[0] || offsetY > yRange[1]) {
            return;
          }

          const mousedownPosition = {
            x: offsetX,
            y: offsetY
          };
          const grp = new zrender.Group({
            draggable: false
          });
          grp.category = 'annotation';
          const rect = new zrender.Rect({
            style: {
              fill: 'transparent',
              stroke: 'red',
              lineWidth: 2
            },
            shape: {
              x: offsetX,
              y: offsetY
            }
          });
          grp.add(rect);
          this.workspace.add(grp);

          const mousemove = (e: any) => {
            const [offsetX, offsetY] = this.workspace.transformCoordToLocal(e.offsetX, e.offsetY);
            const diffX = offsetX - mousedownPosition.x;
            const diffY = offsetY - mousedownPosition.y;
            rect.attr({
              shape: {
                width: offsetX > 0 ? Math.min(diffX, xRange[1] - rect.shape.x) : Math.max(diffX, xRange[0] - rect.shape.x),
                height: offsetY > 0 ? Math.min(diffY, yRange[1] - rect.shape.y) : Math.max(diffY, yRange[0] - rect.shape.y)
              }
            });
          };

          on('mousemove', mousemove);

          const mouseup = () => {
            this.objects.push(grp);

            this.instance.off('mousemove', mousemove);
            this.instance.off('mouseup', mouseup);
          };

          on('mouseup', mouseup);
        };

        on('mousedown', mousedown);
        break;
      }
      case AnnotationEditorMode.Polyline: {
        let points: Array<[number, number]> = [];
        let polyline: any;
        let range = { xRange: [0, 0], yRange: [0, 0] };
        const click = (e: any) => {
          if (!polyline) {
            range = this.computedShapeXyRange(this.image);
          }
          const { xRange, yRange } = range; 
          const [offsetX, offsetY] = this.workspace.transformCoordToLocal(e.offsetX, e.offsetY);
          if (offsetX < xRange[0] || offsetX > xRange[1] || offsetY < yRange[0] || offsetY > yRange[1]) {
            return;
          }
          points.push([offsetX, offsetY]);

          if (!polyline) {
            const grp = new zrender.Group({
              draggable: false
            });
            grp.category = 'annotation';

            polyline = new zrender.Polyline({
              style: {
                fill: 'transparent',
                stroke: 'red',
                lineWidth: 2
              },
              shape: {
                points: []
              }
            });
            grp.add(polyline);

            const mousemove = (e: any) => {
              const [offsetX, offsetY] = this.workspace.transformCoordToLocal(e.offsetX, e.offsetY);
              polyline.attr({
                shape: {
                  points: [...points, [offsetX, offsetY]]
                }
              });
            };
            on('mousemove', mousemove);

            const dblclick = (e: any) => {
              this.instance.off('mousemove', mousemove);
              this.instance.off('dblclick', dblclick);
              const [offsetX, offsetY] = this.workspace.transformCoordToLocal(e.offsetX, e.offsetY);

              if (offsetX < xRange[0] || offsetX > xRange[1] || offsetY < yRange[0] || offsetY > yRange[1]) {
                this.workspace.remove(grp);
                points = [];
                polyline = null;
                return;
              }

              points.splice(-1, 1, points[0]);
              polyline.attr({
                shape: {
                  points: [...points]
                }
              });
              this.objects.push(grp);

              points = [];
              polyline = null;
            };
            on('dblclick', dblclick);

            this.workspace.add(grp);
          }

          polyline.attr({
            shape: {
              points: [...points]
            }
          });
        };
        on('click', click);
        break;
      }
      case AnnotationEditorMode.Edit: {
        this.workspace.eachChild((grp: any) => {
          if (grp.type === 'group' && grp.category === 'annotation') {
            grp.attr({
              draggable: true
            });
          }
        })
        break;
      }
      case AnnotationEditorMode.Move: {
        const mousewheel = (e: any) => {
          if (e.event.altKey) {
            const [scaleX, scaleY] = this.workspace.scale;
            const [offsetX, offsetY] = this.workspace.transformCoordToLocal(e.offsetX, e.offsetY);
            this.workspace.attr({
              origin: [offsetX, offsetY],
              scale: [scaleX + 0.1 * e.wheelDelta, scaleY + 0.1 * e.wheelDelta]
            });
          }
        };
        on('mousewheel', mousewheel);
        break;
      }
    }
  }

  private toObjectModel(obj: ObjectData) {
    const { geometry, group } = obj;

    const grp = new zrender.Group({ ...(group || {}) });
    const type = {
      image: zrender.Image,
      rect: zrender.Rect,
      polyline: zrender.Polyline
    };

    const geo = new type[geometry.type]({
      style: geometry.style,
      shape: geometry.shape,
      position: geometry.position,
      scale: geometry.scale,
      rotation: geometry.rotation
    });

    grp.add(geo);
    return grp;
  }

  private toObjectData(grp: any): ObjectData {
    const geo = grp.childAt(0);
    return {
      group: {
        position: grp.position || [0, 0],
        scale: grp.scale || [1, 1],
        rotation: grp.rotation || 0,
      },
      geometry: {
        type: geo.type,
        style: { ...(geo.style || {}) },
        shape: { ...(geo.shape || {}) },
        position: geo.position || [0, 0],
        scale: geo.scale || [1, 1],
        rotation: geo.rotation || 0,
      }
    }
  }

  public clipImage() {
    const origin = document.createElement('canvas');
    origin.width = this.instance.getWidth();
    origin.height = this.instance.getHeight();

    const instance = zrender.init(origin);

    const workspace = this.toObjectModel(this.toObjectData(this.workspace));
    workspace.attr({
      scale: [1, 1],
      position: [0, 0],
      rotation: 0
    })

    instance.add(workspace);

    let prevGeo: any = null;
    this.objects.forEach(object => {
      if (prevGeo) {
        workspace.removeClipPath();
        workspace.remove(prevGeo);
      }

      const { group, geometry } = this.toObjectData(object);
      const geo = this.toObjectModel({
        group: {
          position: [0, 0],
          scale: [1, 1],
          rotation: 0
        },
        geometry: {
          ...geometry,
          style: {
            ...geometry.style,
            stroke: 'transparent'
          },
          ...group
        }
      });

      prevGeo = geo;
      workspace.add(geo);
      workspace.setClipPath(geo.childAt(0));

      instance.flush();

      const {xRange, yRange} = this.computedShapeXyRange(geo.childAt(0));

      const imageData = origin.getContext('2d')?.getImageData(
        xRange[0] + group.position[0],
        yRange[0] + group.position[1],
        xRange[1] - xRange[0],
        yRange[1] - yRange[0]
      );

      const canvas = document.createElement('canvas');
      canvas.width = xRange[1] - xRange[0];
      canvas.height = yRange[1] - yRange[0];

      const target = zrender.init(canvas);
      canvas.getContext('2d')?.putImageData(imageData as ImageData, 0, 0);

      const link = document.createElement('a');
      link.href = canvas.toDataURL();
      link.download = `./${+new Date()}.png`;
      link.click();

      target.dispose();
    });

    instance.dispose();
  }
}