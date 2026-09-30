import React, { useState, useEffect, useMemo } from 'react';
import { Search, Coffee, CupSoda, Sandwich, CakeSlice, Utensils } from 'lucide-react';
import { supabase } from '../supabaseClient';

// Change this if your prices are in another currency
const CURRENCY = '₹';

const COLORS = {
  bg: '#F8F3EA',
  brown: '#311E18',
  yellow: '#FFD000',
  orange: '#FF7A2F',
  blue: '#0A84FF',
  circle: '#EBE5DA',
  dots: '#B9AEA3',
};

// Photos for the circles and the orange arches.
// Export each photo from Figma as PNG into public/images/, then list it here.
// Keys are lowercase: a category name (circle) or a subcategory name (arch).
// Example:
// 'hot beverages': '/images/hot-beverages.png',
// 'ramen noodles': '/images/ramen.png',
// 'maggi': '/images/maggi.png',
const IMAGES = {};

const norm = (text) => (text || '').trim().toLowerCase();

// Line icon used until a photo is added
const getIcon = (name) => {
  const n = norm(name);
  if (n.includes('hot') || n.includes('coffee')) return Coffee;
  if (n.includes('cold') || n.includes('shake') || n.includes('brew')) return CupSoda;
  if (n.includes('quick') || n.includes('bite') || n.includes('fast')) return Sandwich;
  if (n.includes('dessert') || n.includes('sweet')) return CakeSlice;
  return Utensils;
};

export default function MenuPage({ addToCart }) {
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        setLoading(true);
        const [itemsRes, catsRes] = await Promise.all([
          supabase.from('menu_items').select('*').order('id'),
          supabase.from('categories').select('*').order('display_order'),
        ]);
        if (itemsRes.error) throw itemsRes.error;
        setMenuItems(itemsRes.data || []);
        setCategories(catsRes.data || []);
      } catch (error) {
        console.error('Error fetching menu:', error.message);
        setErrorMsg('Could not load the menu. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchMenu();
  }, []);

  // One section per category, with its available items
  const sections = useMemo(() => {
    const available = menuItems.filter((item) => item.is_available !== false);
    const sorted = [...categories].sort(
      (a, b) => (a.display_order ?? 999) - (b.display_order ?? 999)
    );

    const list = sorted.map((cat) => ({
      key: cat.id,
      name: cat.name,
      items: available.filter((item) => item.category_id === cat.id),
    }));

    // Items whose category is missing still show up
    const knownIds = new Set(categories.map((c) => c.id));
    const orphans = available.filter((item) => !knownIds.has(item.category_id));
    if (orphans.length > 0) list.push({ key: 'other', name: 'Other', items: orphans });

    return list.filter((section) => section.items.length > 0);
  }, [menuItems, categories]);

  // Apply the selected circle and the search text
  const visibleSections = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return sections
      .filter((section) => selectedCategory === 'All' || section.name === selectedCategory)
      .map((section) => ({
        ...section,
        items: section.items.filter(
          (item) =>
            !q ||
            item.name?.toLowerCase().includes(q) ||
            section.name.toLowerCase().includes(q) ||
            item.subcategory?.toLowerCase().includes(q)
        ),
      }))
      .filter((section) => section.items.length > 0);
  }, [sections, selectedCategory, searchQuery]);

  // Split a section's items into sub-groups (Ramen Noodles, Maggi...)
  const buildGroups = (section) => {
    const hasNamed = section.items.some((item) => item.subcategory);
    const map = new Map();
    section.items.forEach((item) => {
      const groupName = item.subcategory || (hasNamed ? 'Other' : '');
      if (!map.has(groupName)) map.set(groupName, []);
      map.get(groupName).push(item);
    });

    const groups = [...map.entries()].map(([name, items]) => ({
      name,
      items,
      image:
        items.map((i) => i.image_url).find(Boolean) ||
        IMAGES[norm(name)] ||
        (name === '' ? IMAGES[norm(section.name)] : '') ||
        '',
    }));

    // "Other" always goes last
    return groups.sort((a, b) => (a.name === 'Other') - (b.name === 'Other'));
  };

  const renderCircle = (label) => {
    const isSelected = selectedCategory === label;
    const section = sections.find((s) => s.name === label);
    const photo =
      IMAGES[norm(label)] || section?.items.map((i) => i.image_url).find(Boolean);
    const Icon = label === 'All' ? Utensils : getIcon(label);

    return (
      <button
        key={label}
        type="button"
        className="mp-cat"
        aria-pressed={isSelected}
        onClick={() => setSelectedCategory(isSelected && label !== 'All' ? 'All' : label)}
      >
        <span className={`mp-circle ${isSelected ? 'selected' : ''}`}>
          {photo ? <img src={photo} alt="" /> : <Icon size={34} strokeWidth={1.6} />}
        </span>
        <span className="mp-cat-label">{label}</span>
      </button>
    );
  };

  const renderItems = (group) => (
    <div className="mp-list">
      {group.name && <h3 className="mp-group">{group.name}</h3>}
      {group.items.map((item) => (
        <div className="mp-item" key={item.id}>
          <span className="mp-name">{item.name}</span>
          <span className="mp-dots" aria-hidden="true" />
          <span className="mp-price">
            {CURRENCY} {item.price}
          </span>
          <button
            type="button"
            className="mp-add"
            onClick={() => addToCart && addToCart(item)}
            aria-label={`Add ${item.name} to cart`}
          >
            ADD +
          </button>
        </div>
      ))}
    </div>
  );

  const renderArt = (group, sectionName) => {
    const Icon = getIcon(group.name || sectionName);
    return (
      <div className="mp-art">
        <div className="mp-arch" />
        {group.image ? (
          <img src={group.image} alt={group.name || sectionName} />
        ) : (
          <Icon className="mp-art-icon" size={84} strokeWidth={1.2} aria-hidden="true" />
        )}
      </div>
    );
  };

  return (
    <div className="mp-page">
      <style>{`
        .mp-page { background: ${COLORS.bg}; height: 100vh; height: 100dvh; overflow-y: auto; -webkit-overflow-scrolling: touch; padding: 120px 20px 60px; box-sizing: border-box; color: ${COLORS.brown}; }
        .mp-wrap { max-width: 900px; margin: 0 auto; }

        .mp-search { position: relative; max-width: 760px; margin: 0 auto 32px; }
        .mp-search input { width: 100%; box-sizing: border-box; padding: 15px 56px 15px 26px; border-radius: 40px; border: 2px solid ${COLORS.brown}; background: #FFF6EC; font-size: 1rem; color: ${COLORS.brown}; outline: none; }
        .mp-search input:focus-visible { box-shadow: 0 0 0 3px ${COLORS.yellow}; }
        .mp-search svg { position: absolute; right: 22px; top: 50%; transform: translateY(-50%); color: ${COLORS.brown}; }

        .mp-cats { display: flex; gap: 28px; justify-content: center; flex-wrap: wrap; margin-bottom: 48px; }
        .mp-cat { background: none; border: none; padding: 0; cursor: pointer; text-align: center; color: ${COLORS.brown}; }
        .mp-circle { display: flex; align-items: center; justify-content: center; width: 92px; height: 92px; border-radius: 50%; background: ${COLORS.circle}; border: 5px solid #FFF; box-sizing: border-box; overflow: hidden; margin: 0 auto 8px; transition: transform .15s; color: ${COLORS.brown}; }
        .mp-circle img { width: 100%; height: 100%; object-fit: cover; }
        .mp-circle.selected { border-color: ${COLORS.yellow}; box-shadow: 0 0 0 2px ${COLORS.brown}; }
        .mp-cat:hover .mp-circle { transform: scale(1.05); }
        .mp-cat:focus-visible .mp-circle { box-shadow: 0 0 0 3px ${COLORS.blue}; }
        .mp-cat-label { font-size: 0.8rem; font-weight: 600; }

        .mp-section { margin-bottom: 64px; }
        .mp-title { font-family: 'Luckiest Guy', cursive; font-weight: 400; color: ${COLORS.blue}; font-size: 2.8rem; letter-spacing: 1px; margin: 0 0 22px; }

        .mp-row { display: grid; grid-template-columns: 1fr 270px; gap: 40px; align-items: start; margin-bottom: 36px; }
        .mp-row.flip { grid-template-columns: 270px 1fr; }

        .mp-group { font-size: 1.1rem; font-style: italic; margin: 0 0 18px; }
        .mp-item { display: flex; align-items: baseline; gap: 10px; margin-bottom: 16px; }
        .mp-name { font-weight: 700; font-size: 0.95rem; }
        .mp-dots { flex: 1; border-bottom: 2px dotted ${COLORS.dots}; transform: translateY(-4px); min-width: 12px; }
        .mp-price { font-weight: 700; font-size: 0.95rem; white-space: nowrap; }
        .mp-add { background: ${COLORS.yellow}; color: ${COLORS.brown}; border: none; padding: 5px 14px; border-radius: 14px; font-weight: 800; font-size: 0.7rem; cursor: pointer; }
        .mp-add:hover { filter: brightness(0.95); }
        .mp-add:active { transform: scale(0.95); }

        .mp-art { position: sticky; top: 130px; align-self: start; width: 270px; height: 300px; }
        .mp-arch { position: absolute; bottom: 0; left: 40px; width: 190px; height: 225px; background: ${COLORS.orange}; border-radius: 95px 95px 0 0; }
        .mp-art img { position: absolute; left: 0; bottom: 20px; width: 270px; height: 270px; object-fit: contain; }
        .mp-art-icon { position: absolute; left: 50%; bottom: 80px; transform: translateX(-50%); color: #FFF3E6; }

        .mp-message { text-align: center; padding: 40px 0; }

        @media (max-width: 700px) {
          .mp-row, .mp-row.flip { grid-template-columns: 1fr; gap: 20px; }
          .mp-art { position: relative; top: 0; margin: 0 auto; order: -1; }
          .mp-title { font-size: 2.1rem; }
        }
      `}</style>

      <div className="mp-wrap">
        <div className="mp-search">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by item or category"
            aria-label="Search menu"
          />
          <Search size={22} aria-hidden="true" />
        </div>

        <div className="mp-cats">
          {renderCircle('All')}
          {sections.map((section) => renderCircle(section.name))}
        </div>

        {loading ? (
          <p className="mp-message">Loading menu...</p>
        ) : errorMsg ? (
          <p className="mp-message" style={{ color: '#B3261E' }}>{errorMsg}</p>
        ) : sections.length === 0 ? (
          <p className="mp-message">The menu is empty right now. Please check back soon.</p>
        ) : visibleSections.length === 0 ? (
          <p className="mp-message">Nothing matches "{searchQuery}". Try another item or category.</p>
        ) : (
          visibleSections.map((section) => (
            <section className="mp-section" key={section.key}>
              <h2 className="mp-title">{section.name}</h2>

              {buildGroups(section).map((group, index) => {
                const flip = index % 2 === 1;
                return (
                  <div key={group.name || 'items'} className={`mp-row ${flip ? 'flip' : ''}`}>
                    {flip && renderArt(group, section.name)}
                    {renderItems(group)}
                    {!flip && renderArt(group, section.name)}
                  </div>
                );
              })}
            </section>
          ))
        )}
      </div>
    </div>
  );
}