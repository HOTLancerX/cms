'use client';

/**
 * cms/components/Ads.tsx
 *
 * Decoupled Dynamic Ads Component Wrapper.
 * Resolves the "news-ads.Ads" lazy component dynamically via hook/pluginHooks.
 * If news-ads plugin is disabled, inactive, or not present, renders null safely
 * without static build-time dependencies or Webpack module errors.
 */

import { useEffect, useState, ComponentType } from 'react';
import { resolveLazyComponent } from '@/hook/pluginHooks';
import { useActivePlugins } from '@/hook/useActivePlugins';

export interface AdsProps {
    type: 'single' | 'category' | 'header' | 'footer' | 'popup';
    slot?:
        | 'top'
        | 'belowTitle'
        | 'imageOverlay'
        | 'aboveDescription'
        | 'middle'
        | 'belowDescription'
        | 'bottom'
        | 'left'
        | 'right'
        | 'logoLeft'
        | 'logoRight'
        | 'leftTop'
        | 'leftBottom'
        | 'rightTop'
        | 'rightBottom'
        | (string & {});
    settings?: Record<string, any>;
    className?: string;
    fallback?: React.ReactNode;
}

export default function Ads(props: AdsProps) {
    const activePlugins = useActivePlugins();
    const [AdComponent, setAdComponent] = useState<ComponentType<AdsProps> | null>(null);

    useEffect(() => {
        if (activePlugins === null) return;

        let isMounted = true;
        resolveLazyComponent("news-ads.Ads")
            .then((Comp) => {
                if (isMounted && Comp) {
                    setAdComponent(() => Comp as ComponentType<AdsProps>);
                }
            })
            .catch(() => {
                if (isMounted) setAdComponent(null);
            });

        return () => {
            isMounted = false;
        };
    }, [activePlugins]);

    if (!AdComponent) return null;

    return <AdComponent {...props} />;
}
