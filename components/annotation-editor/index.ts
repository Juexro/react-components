import zrender from 'zrender';

export interface AnnotationEditorOptions {
  imgUrl: string;
  mode?: AnnotationEditorMode;
  select?: (instance: any, data: ObjectData) => void;
}

export interface OptionalAnnotationEditorOptions {
  imgUrl?: string;
  mode?: AnnotationEditorMode;
  select?: (instance: any, data: ObjectData) => void;
}

export interface ObjectData {
  type: 'image' | 'rect' | 'polyline',
  style: { [name: string ]: any },
  shape: { [name: string ]: any },
  position: [number, number],
  scale: [number, number],
  rotation: number,
}

export enum AnnotationEditorMode {
  Rect = 1,
  Polyline,
  DragImage,
  Edit,
  Scale,
  Select
}

export default class AnnotationEditor {
  public instance: any;
  public options: AnnotationEditorOptions | OptionalAnnotationEditorOptions = {};
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
    
    if (imgUrl) {
      await this.drawImage(imgUrl);
    }

    this.setMode(mode);
  }

  private async drawImage(url: string) {
    if (this.image) {
      this.workspace.remove(this.image);
    }
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
    this.image = geo;
    this.workspace.add(geo);
  }

  public setModel(model: ObjectData[]) {
    this.objects.forEach(object => {
      this.workspace.remove(object);
    });
    this.objects = [];

    model.forEach(data => {
      const geo = this.toObjectModel(data);
      this.objects.push(geo);
      this.workspace.add(geo);
    });
  }

  public getModel() {
    return this.objects.map(object => this.toObjectData(object));
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

  private computedNumberInRange(number: number, range: [number, number]) {
    if (number > range[1]) {
      return range[1];
    }
    if (number < range[0]) {
      return range[0];
    }
    return number;
  }

  private switchModeHooks: Array<() => void> = [];

  public setMode(mode: AnnotationEditorMode | undefined | AnnotationEditorMode[]) {
    this.workspace.attr({
      draggable: false
    });
    this.switchModeHooks.forEach(handler => {
      handler();
    });
    this.switchModeHooks = [];

    if (Array.isArray(mode)) {
      mode.forEach(item => {
        this.switchMode(item);
      })
    } else {
      this.switchMode(mode);
    }
  }

  public switchMode(mode: AnnotationEditorMode | undefined) {
    const on = (name: string, handler: Function) => {
      this.instance.on(name, handler);
      this.switchModeHooks.push(() => {
        this.instance.off(name, handler);
      });
    };

    switch(mode) {
      case AnnotationEditorMode.DragImage: {
        this.workspace.attr({
          draggable: true
        });
        break;
      }
      case AnnotationEditorMode.Rect: {
        const mousedown = (e: any) => {
          e.cancelBubble = true;
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
            draggable: false,
            position: [0, 0]
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
            e.cancelBubble = true;
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

          const mouseup = (e: any) => {
            e.cancelBubble = true;
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
          e.cancelBubble = true;
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
              draggable: false,
              position: [0, 0]
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
              e.cancelBubble = true;
              const [offsetX, offsetY] = this.workspace.transformCoordToLocal(e.offsetX, e.offsetY);
              polyline.attr({
                shape: {
                  points: [...points, [offsetX, offsetY]]
                }
              });
            };
            on('mousemove', mousemove);

            const dblclick = (e: any) => {
              e.cancelBubble = true;
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
            const mousedown = (e: any) => {
              e.cancelBubble = true;
              const [offsetX, offsetY] = this.workspace.transformCoordToLocal(e.offsetX, e.offsetY);
              const mousedownPosition = {
                x: offsetX,
                y: offsetY
              };

              const geoRange = this.computedShapeXyRange(grp.childAt(0));

              const range = {
                rangeX: [geoRange.xRange[0] + grp.position[0], geoRange.xRange[1] + grp.position[0]],
                rangeY: [geoRange.yRange[0] + grp.position[1], geoRange.yRange[1] + grp.position[1]]
              };
              const [positionX, positionY] = grp.position;

              const xRange: [number, number] = [-range.rangeX[0], this.image.style.width - range.rangeX[1]];
              const yRange: [number, number] = [-range.rangeY[0], this.image.style.height - range.rangeY[1]];
      
              const mousemove = (e: any) => {
                e.cancelBubble = true;
                const [offsetX, offsetY] = this.workspace.transformCoordToLocal(e.offsetX, e.offsetY);

                grp.attr({
                  position: [
                    positionX + this.computedNumberInRange(offsetX - mousedownPosition.x, xRange),
                    positionY + this.computedNumberInRange(offsetY - mousedownPosition.y, yRange)
                  ]
                })
              };
              this.instance.on('mousemove', mousemove);
              const mouseup = (e: any) => {
                e.cancelBubble = true;
                this.instance.off('mousemove', mousemove);
                this.instance.off('mouseup', mouseup);
              };
              this.instance.on('mouseup', mouseup);
            };

            grp.on('mousedown', mousedown);
            this.switchModeHooks.push(() => {
              grp.off('mousedown', mousedown);
            });
          }
        })
        break;
      }
      case AnnotationEditorMode.Scale: {
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
      case AnnotationEditorMode.Select: {
        const click = (e: any) => {
          e.cancelBubble = true;
          const grp = this.getObjectGroup(e.target);
          if (grp && this.options.select) {
            this.options.select(grp, this.toObjectData(grp));
          } 
        };

        on('click', click);
        break;
      }
    }
  }

  private getObjectGroup(target: any): undefined | any {
    if (!target) {
      return;
    }
    let depth = 0;

    const deep = (node: any): undefined | any => {
      if (depth > 5) {
        return;
      }
      if (node instanceof zrender.Group) {
        return node.category === 'annotation' && node;
      }
      if (!node.parent) {
        return;
      }
      depth++;
      return deep(node.parent);
    }

    return deep(target);
  }

  private toObjectModel(obj: ObjectData, isGroup = true) {
    const { type, position = [0, 0], scale = [1, 1], rotation = 0, style = {}, shape = {} } = obj;

    const GeoMap = {
      image: zrender.Image,
      rect: zrender.Rect,
      polyline: zrender.Polyline
    };

    if (isGroup) {
      const grp = new zrender.Group({
        position,
        scale,
        rotation
      });
      grp.category = 'annotation';

      const geo = new GeoMap[type]({
        style,
        shape
      });
  
      grp.add(geo);
      return grp;
    } else {
      return new GeoMap[type]({
        position,
        scale,
        rotation,
        style,
        shape
      })
    }
  }

  private toObjectData(grp: any): ObjectData {
    const geo = grp.childAt(0);

    return {
      type: geo.type,
      style: { ...(geo.style || {}) },
      shape: { ...(geo.shape || {}) },
      position: grp.position || [0, 0],
      scale: grp.scale || [1, 1],
      rotation: grp.rotation || 0,
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

      const objectData = this.toObjectData(object);
      const geo = this.toObjectModel({
        ...objectData,
        style: {
          ...objectData.style,
          stroke: 'transparent'
        },
      }, false);

      prevGeo = geo;
      workspace.add(geo);
      workspace.setClipPath(geo);

      instance.flush();

      const {xRange, yRange} = this.computedShapeXyRange(geo);

      const imageData = origin.getContext('2d')?.getImageData(
        xRange[0] + objectData.position[0],
        yRange[0] + objectData.position[1],
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