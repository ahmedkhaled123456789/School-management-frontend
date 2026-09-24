import React from 'react';
import { cn } from '../../utils/cn';

export const LOGO_URL = "/logo.png";


export const SCHOOL_NAME = 'Al Shorouk American School';

interface LogoProps {
  /** Light-on-dark artwork: place it on a dark surface, or let it sit on a dark plate. */
  surface?: 'dark' | 'light';
  className?: string;
  imageClassName?: string;
}

export function Logo({ surface = 'dark', className, imageClassName }: LogoProps) {
  const image =
  <img
    src={LOGO_URL}
    alt={SCHOOL_NAME}
    className={cn('h-14 w-auto object-contain', imageClassName)} />;



  if (surface === 'light') {
    return (
      <span
        className={cn(
          'inline-flex items-center rounded-xl bg-primary-800 px-3 py-2',
          className
        )}>
        
        {image}
      </span>);

  }

  return <span className={cn('inline-flex items-center', className)}>{image}</span>;
}