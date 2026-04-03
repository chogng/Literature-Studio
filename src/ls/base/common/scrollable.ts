export interface IScrollDimensions {
  width: number;
  height: number;
  scrollWidth: number;
  scrollHeight: number;
}

export interface IScrollPosition {
  scrollLeft: number;
  scrollTop: number;
}

export interface INewScrollDimensions {
  width?: number;
  height?: number;
  scrollWidth?: number;
  scrollHeight?: number;
}

export interface INewScrollPosition {
  scrollLeft?: number;
  scrollTop?: number;
}

export interface ScrollEvent extends IScrollPosition {
  scrollLeftChanged: boolean;
  scrollTopChanged: boolean;
}
